import concurrent.futures
import os
import logging
from fastapi import APIRouter, Security, BackgroundTasks
from pydantic import BaseModel
from supabase import create_client

from auth import verify_token
from rate_limit import check_rate_limit
from services.flowable import extract_event_log
from services.mining import run_discovery

MINING_TIMEOUT_SECONDS = 120

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class DiscoverRequest(BaseModel):
    job_id: str
    tenant_id: str
    flowable_tenant_id: str


def _run_job(job_id: str, flowable_tenant_id: str) -> None:
    """Voer de analyse uit en sla resultaat op in Supabase."""
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    try:
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = extract_event_log(flowable_tenant_id)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_discovery, df)
            try:
                result = future.result(timeout=MINING_TIMEOUT_SECONDS)
            except concurrent.futures.TimeoutError:
                raise TimeoutError(
                    f"Analyse timeout bereikt ({MINING_TIMEOUT_SECONDS}s). "
                    "Probeer met een kleinere selectie van events."
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
            "error_message": "Analyse mislukt. Controleer de Flowable-verbinding.",
            "completed_at": "now()",
        }).eq("id", job_id).execute()


@router.post("/discover")
def discover(
    req: DiscoverRequest,
    background_tasks: BackgroundTasks,
    _token: str = Security(verify_token),
) -> dict:
    check_rate_limit(req.tenant_id)
    background_tasks.add_task(_run_job, req.job_id, req.flowable_tenant_id)
    return {"accepted": True, "job_id": req.job_id}
