import os
from fastapi import APIRouter, Security, HTTPException, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from supabase import create_client

from services.flowable import extract_event_log
from services.mining import run_discovery

router = APIRouter()
security = HTTPBearer()

MINING_ENGINE_SECRET = os.getenv("MINING_ENGINE_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not MINING_ENGINE_SECRET or credentials.credentials != MINING_ENGINE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class DiscoverRequest(BaseModel):
    job_id: str
    tenant_id: str
    flowable_tenant_id: str


def _run_job(job_id: str, flowable_tenant_id: str):
    """Voer de analyse uit en sla resultaat op in Supabase."""
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = extract_event_log(flowable_tenant_id)
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


@router.post("/discover")
def discover(
    req: DiscoverRequest,
    background_tasks: BackgroundTasks,
    _token: str = Security(verify_token),
):
    background_tasks.add_task(_run_job, req.job_id, req.flowable_tenant_id)
    return {"accepted": True, "job_id": req.job_id}
