import io
import os
import uuid
from datetime import datetime, timezone

import pandas as pd
from fastapi import APIRouter, File, Form, HTTPException, Security, UploadFile
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
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


def _supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


@router.post("/logs")
async def upload_log(
    file: UploadFile = File(...),
    tenant_id: str = Form(...),
    _token: str = Security(verify_token),
):
    """
    Accepteer CSV upload, voer process discovery uit, sla resultaat op in Supabase.
    Verwacht kolommen: case_id, activity, timestamp, resource (optioneel), duration_ms (optioneel)
    """
    content = await file.read()

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"CSV parse fout: {exc}")

    required = {"case_id", "activity", "timestamp"}
    missing = required - set(df.columns)
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Verplichte kolommen ontbreken: {', '.join(missing)}",
        )

    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    sb = _supabase()
    sb.table("mining_jobs").insert(
        {
            "id": job_id,
            "tenant_id": tenant_id,
            "source": "csv_upload",
            "filename": file.filename,
            "status": "running",
            "event_count": len(df),
            "created_at": now,
        }
    ).execute()

    try:
        result = run_discovery(df)
        sb.table("mining_jobs").update(
            {
                "status": "done",
                "result": result,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()
    except Exception as exc:
        sb.table("mining_jobs").update(
            {
                "status": "error",
                "error_message": str(exc),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", job_id).execute()
        raise HTTPException(status_code=422, detail=f"Analyse mislukt: {exc}")

    return {"job_id": job_id, "event_count": len(df), "status": "done"}


@router.get("/results/{job_id}")
def get_result(
    job_id: str,
    _token: str = Security(verify_token),
):
    """Geef analyse-resultaat terug op basis van job_id."""
    sb = _supabase()
    resp = sb.table("mining_jobs").select("*").eq("id", job_id).single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden")

    job = resp.data
    return {
        "job_id": job["id"],
        "status": job["status"],
        "event_count": job.get("event_count"),
        "source": job.get("source"),
        "filename": job.get("filename"),
        "created_at": job.get("created_at"),
        "completed_at": job.get("completed_at"),
        "error_message": job.get("error_message"),
        "result": job.get("result") if job["status"] == "done" else None,
    }
