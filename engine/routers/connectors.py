import os
import logging
from fastapi import APIRouter, Security, HTTPException
from pydantic import BaseModel
from supabase import create_client

from auth import verify_token
from services.flowable import extract_event_log
from services.mining import run_discovery

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


class FlowableTestRequest(BaseModel):
    db_url: str


class FlowableSyncRequest(BaseModel):
    job_id: str
    tenant_id: str
    flowable_tenant_id: str
    db_url: str


@router.post("/flowable/test")
def flowable_test(
    req: FlowableTestRequest,
    _token: str = Security(verify_token),
):
    """Test de Flowable-verbinding: geef het aantal events terug."""
    try:
        import psycopg2
        conn = psycopg2.connect(req.db_url)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM act_hi_actinst WHERE act_name_ IS NOT NULL")
                count = cur.fetchone()[0]
        finally:
            conn.close()
        return {"ok": True, "event_count": int(count)}
    except Exception:
        # Stuur geen interne foutdetails terug
        raise HTTPException(status_code=400, detail="Verbinding mislukt. Controleer de connection string.")


def _run_flowable_job(job_id: str, flowable_tenant_id: str, db_url: str) -> None:
    """Voer de analyse uit met expliciete db_url en sla resultaat op in Supabase."""
    import concurrent.futures
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    TIMEOUT = 120

    try:
        supabase.table("mining_jobs").update({"status": "running"}).eq("id", job_id).execute()

        df = extract_event_log(flowable_tenant_id, db_url=db_url)

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(run_discovery, df)
            try:
                result = future.result(timeout=TIMEOUT)
            except concurrent.futures.TimeoutError:
                raise TimeoutError(
                    f"Analyse timeout bereikt ({TIMEOUT}s). Probeer met een kleinere selectie van events."
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
        logger.error("Flowable sync mislukt voor job %s: %s", job_id, exc, exc_info=True)
        supabase.table("mining_jobs").update({
            "status": "error",
            "error_message": "Synchronisatie mislukt. Controleer de Flowable-verbinding.",
            "completed_at": "now()",
        }).eq("id", job_id).execute()


@router.post("/flowable/sync")
def flowable_sync(
    req: FlowableSyncRequest,
    _token: str = Security(verify_token),
):
    """Start een Flowable-sync job als achtergrondtaak."""
    import threading
    thread = threading.Thread(
        target=_run_flowable_job,
        args=(req.job_id, req.flowable_tenant_id, req.db_url),
        daemon=True,
    )
    thread.start()
    return {"accepted": True, "job_id": req.job_id}
