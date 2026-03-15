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
        return pd.read_csv(io.BytesIO(content))


def _run_analysis(job_id: str, filename: str, content: bytes) -> None:
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    try:
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = _parse_file(filename, content)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_discovery, df)
            try:
                result = future.result(timeout=MINING_TIMEOUT_SECONDS)
            except concurrent.futures.TimeoutError:
                raise TimeoutError(
                    f"Analyse timeout bereikt ({MINING_TIMEOUT_SECONDS}s). "
                    "Probeer met een kleiner event log."
                )

        supabase.table("mining_jobs").update({
            "status": "done",
            "result": result,
            "event_count": len(df),
            "completed_at": "now()",
        }).eq("id", job_id).execute()

    except TimeoutError as exc:
        logger.warning("Analyse timeout voor job %s", job_id)
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": str(exc),
            "completed_at": "now()",
        }).eq("id", job_id).execute()
    except Exception as exc:
        logger.error("Analyse mislukt voor job %s: %s", job_id, exc, exc_info=True)
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

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    supabase.table("mining_jobs").insert({
        "id": job_id,
        "status": "pending",
    }).execute()

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
