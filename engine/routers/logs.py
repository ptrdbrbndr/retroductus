import io
import os
import tempfile
import uuid

import pandas as pd
import pm4py
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Security, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client

from services.mining import run_discovery

router = APIRouter()
security = HTTPBearer()

MINING_ENGINE_SECRET = os.getenv("MINING_ENGINE_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not MINING_ENGINE_SECRET or credentials.credentials != MINING_ENGINE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


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


def _run_analysis(job_id: str, filename: str, content: bytes):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    try:
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = _parse_file(filename, content)
        result = run_discovery(df)

        supabase.table("mining_jobs").update({
            "status": "done",
            "result": result,
            "event_count": len(df),
            "completed_at": "now()",
        }).eq("id", job_id).execute()

    except Exception as exc:
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": str(exc),
            "completed_at": "now()",
        }).eq("id", job_id).execute()


@router.post("/logs")
async def upload_log(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    _token: str = Security(verify_token),
):
    if not (file.filename.endswith(".csv") or file.filename.endswith(".xes")):
        raise HTTPException(status_code=400, detail="Alleen CSV en XES bestanden zijn toegestaan.")

    content = await file.read()
    job_id = str(uuid.uuid4())

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    supabase.table("mining_jobs").insert({
        "id": job_id,
        "status": "pending",
    }).execute()

    background_tasks.add_task(_run_analysis, job_id, file.filename, content)
    return {"job_id": job_id}


@router.get("/results/{job_id}")
def get_result(
    job_id: str,
    _token: str = Security(verify_token),
):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    result = supabase.table("mining_jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden.")
    return result.data
