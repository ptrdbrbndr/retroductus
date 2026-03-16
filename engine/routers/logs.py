import concurrent.futures
import io
import os
import tempfile
import uuid
import logging

import pandas as pd
import pm4py
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Security, UploadFile
from supabase import create_client

from auth import verify_token
from rate_limit import check_rate_limit
from services.mining import run_discovery

MINING_TIMEOUT_SECONDS = 120

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

ALLOWED_CONTENT_TYPES = {"text/csv", "application/xml", "text/xml", "application/octet-stream"}
ALLOWED_EXTENSIONS = {".csv", ".xes"}

# Maximale bestandsgrootte per plan (bytes)
MAX_FILE_SIZE: dict[str, int] = {
    "free": 10 * 1024 * 1024,      # 10 MB
    "starter": 100 * 1024 * 1024,  # 100 MB
    "pro": 1024 * 1024 * 1024,     # 1 GB
}
DEFAULT_MAX_FILE_SIZE = MAX_FILE_SIZE["free"]


_COLUMN_ALIASES: dict[str, list[str]] = {
    "case_id": [
        "case id", "caseid", "case-id", "case_id", "traceid", "trace id", "trace_id",
        "process_instance", "process instance", "instanceid", "instance id",
        "case", "trace",
    ],
    "activity": [
        "activity", "activity name", "activityname", "activity_name",
        "task", "task name", "taskname", "event", "event name", "eventname",
        "action", "step", "stap", "activiteit",
    ],
    "timestamp": [
        "timestamp", "time", "date", "datetime", "event time", "eventtime",
        "event_time", "start time", "starttime", "start_time",
        "complete time", "completetime", "complete_time",
        "tijdstip", "datum", "tijd",
    ],
    "resource": [
        "resource", "performer", "user", "agent", "employee", "medewerker",
        "org:resource", "assigned to", "assignedto", "assigned_to",
        "actor", "uitvoerder",
    ],
}

_REQUIRED_COLUMNS = ["case_id", "activity", "timestamp"]


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normaliseer kolomnamen naar de verwachte standaardnamen (case_id, activity, timestamp, resource).
    Accepteert gangbare varianten en is case-insensitief.
    """
    # Stap 1: lowercase + strip alle kolomnamen
    df = df.copy()
    df.columns = [str(c).lower().strip() for c in df.columns]

    # Stap 2: vervang spaties en koppeltekens door underscores
    df.columns = [c.replace(" ", "_").replace("-", "_") for c in df.columns]

    # Stap 3: map aliassen naar standaardnamen
    rename_map: dict[str, str] = {}
    current_cols = set(df.columns)
    for standard, aliases in _COLUMN_ALIASES.items():
        if standard not in current_cols:
            for alias in aliases:
                normalized_alias = alias.lower().strip().replace(" ", "_").replace("-", "_")
                if normalized_alias in current_cols:
                    rename_map[normalized_alias] = standard
                    break

    if rename_map:
        df = df.rename(columns=rename_map)

    # Stap 4: valideer vereiste kolommen
    missing = [c for c in _REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        found = list(df.columns)
        raise ValueError(
            f"Verplichte kolommen ontbreken: {', '.join(missing)}. "
            f"Gevonden kolommen: {', '.join(found)}. "
            f"Hernoem je kolommen naar: case_id, activity, timestamp (en optioneel resource)."
        )

    return df


def _parse_file(filename: str, content: bytes) -> pd.DataFrame:
    if filename.endswith(".xes"):
        with tempfile.NamedTemporaryFile(suffix=".xes", delete=False) as f:
            f.write(content)
            tmp_path = f.name
        try:
            log = pm4py.read_xes(tmp_path)
            df = pm4py.convert_to_dataframe(log)
        finally:
            os.unlink(tmp_path)

        df = df.rename(columns={
            "case:concept:name": "case_id",
            "concept:name": "activity",
            "time:timestamp": "timestamp",
            "org:resource": "resource",
        })
        return df
    else:
        df = pd.read_csv(io.BytesIO(content))
        return _normalize_columns(df)


def _run_analysis(job_id: str, filename: str, content: bytes) -> None:
    import time as _time
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    try:
        logger.info("[job:%s] analyse gestart — bestand: %s (%d bytes)", job_id, filename, len(content))
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = _parse_file(filename, content)
        logger.info("[job:%s] bestand geparsed — %d rijen", job_id, len(df))

        t0 = _time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_discovery, df)
            try:
                result = future.result(timeout=MINING_TIMEOUT_SECONDS)
            except concurrent.futures.TimeoutError:
                raise TimeoutError(
                    f"Analyse timeout bereikt ({MINING_TIMEOUT_SECONDS}s). "
                    "Probeer met een kleiner event log."
                )
        elapsed = _time.perf_counter() - t0

        supabase.table("mining_jobs").update({
            "status": "done",
            "result": result,
            "event_count": len(df),
            "completed_at": "now()",
        }).eq("id", job_id).execute()
        logger.info("[job:%s] klaar in %.1fs — %d events", job_id, elapsed, len(df))

    except TimeoutError as exc:
        logger.warning("[job:%s] timeout na %ds", job_id, MINING_TIMEOUT_SECONDS)
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": str(exc),
            "completed_at": "now()",
        }).eq("id", job_id).execute()
    except ValueError as exc:
        logger.warning("[job:%s] ongeldige invoer: %s", job_id, exc)
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": str(exc),
            "completed_at": "now()",
        }).eq("id", job_id).execute()
    except Exception as exc:
        logger.error("[job:%s] analyse mislukt: %s", job_id, exc, exc_info=True)
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": "Analyse mislukt. Controleer het bestandsformaat.",
            "completed_at": "now()",
        }).eq("id", job_id).execute()


@router.post("/logs")
async def upload_log(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    _token: str = Security(verify_token),
) -> dict:
    check_rate_limit(tenant_id)

    # Valideer extensie
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Alleen CSV en XES bestanden zijn toegestaan.")

    # Lees bestand en controleer grootte
    content = await file.read()
    if len(content) > DEFAULT_MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Bestand te groot. Maximum is {DEFAULT_MAX_FILE_SIZE // (1024 * 1024)} MB.",
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Leeg bestand geüpload.")

    job_id = str(uuid.uuid4())
    logger.info("[job:%s] upload ontvangen — tenant:%s bestand:%s (%d bytes)", job_id, tenant_id, filename, len(content))

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    insert_resp = supabase.table("mining_jobs").insert({
        "id": job_id,
        "status": "pending",
        "user_id": tenant_id,
    }).execute()
    if not insert_resp.data:
        logger.error("[job:%s] Supabase insert mislukt — response: %s", job_id, insert_resp)
        raise HTTPException(status_code=500, detail="Kon job niet aanmaken.")
    logger.info("[job:%s] job aangemaakt in Supabase", job_id)

    background_tasks.add_task(_run_analysis, job_id, filename, content)
    return {"job_id": job_id}


@router.get("/results/{job_id}")
def get_result(
    job_id: str,
    _token: str = Security(verify_token),
) -> dict:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    result = supabase.table("mining_jobs").select("*").eq("id", job_id).maybe_single().execute()
    if result is None or not result.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden.")
    return result.data
