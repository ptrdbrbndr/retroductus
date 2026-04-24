import os
import logging
from fastapi import APIRouter, Security, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from supabase import create_client
import pandas as pd
import pm4py
import tempfile
import json

from auth import verify_token

logger = logging.getLogger(__name__)

router = APIRouter()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def _get_event_log_from_job(job: dict):
    """Herstel event log uit mining job resultaat."""
    result = job.get("result") or {}
    nodes = result.get("dfg_nodes", [])
    edges = result.get("dfg_edges", [])
    start_acts = result.get("start_activities", {})
    end_acts = result.get("end_activities", {})
    return nodes, edges, start_acts, end_acts


def _compute_conformance_from_dfg(nodes, edges, start_acts, end_acts, bpmn_activities: list[str] | None = None):
    """
    Bereken conformance metrics op basis van DFG structuur.

    Fitness = fractie van activiteiten die in het model voorkomen
    Precision = fractie van model-activiteiten die ook in de log voorkomen
    """
    log_activities = {n.get("activity", "") for n in nodes if n.get("activity")}

    if bpmn_activities:
        model_activities = set(bpmn_activities)
    else:
        model_activities = set(start_acts.keys()) | set(end_acts.keys())
        for e in edges:
            src = e.get("from") or e.get("source", "")
            tgt = e.get("to") or e.get("target", "")
            if src:
                model_activities.add(src)
            if tgt:
                model_activities.add(tgt)

    if not log_activities or not model_activities:
        return {
            "fitness": None,
            "precision": None,
            "deviations": [],
            "error": "Onvoldoende data voor conformance berekening",
        }

    matching = log_activities & model_activities
    fitness = len(matching) / len(log_activities) if log_activities else 0
    precision = len(matching) / len(model_activities) if model_activities else 0

    deviations_in_log = [
        {"activity": act, "type": "log_only", "description": f"'{act}' komt voor in de log maar niet in het model"}
        for act in sorted(log_activities - model_activities)
    ]
    deviations_in_model = [
        {"activity": act, "type": "model_only", "description": f"'{act}' staat in het model maar niet in de log"}
        for act in sorted(model_activities - log_activities)
    ]

    return {
        "fitness": round(fitness, 3),
        "precision": round(precision, 3),
        "f1_score": round(2 * fitness * precision / (fitness + precision), 3) if (fitness + precision) > 0 else 0,
        "log_activity_count": len(log_activities),
        "model_activity_count": len(model_activities),
        "matching_count": len(matching),
        "deviations": deviations_in_log + deviations_in_model,
        "log_activities": sorted(log_activities),
        "model_activities": sorted(model_activities),
    }


@router.post("/check")
async def conformance_check(
    job_id: str = Form(...),
    bpmn_file: UploadFile | None = File(None),
    _token: str = Security(verify_token),
):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    resp = supabase.table("mining_jobs").select("*").eq("id", job_id).maybe_single().execute()
    if resp is None or not resp.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden")

    job = resp.data
    if job.get("status") != "done":
        raise HTTPException(status_code=400, detail="Analyse nog niet afgerond")

    nodes, edges, start_acts, end_acts = _get_event_log_from_job(job)

    bpmn_activities = None
    if bpmn_file:
        content = await bpmn_file.read()
        import re
        text = content.decode("utf-8", errors="ignore")
        names = re.findall(r'name="([^"]+)"', text)
        bpmn_activities = [n.strip() for n in names if n.strip()]

    result = _compute_conformance_from_dfg(nodes, edges, start_acts, end_acts, bpmn_activities)

    supabase.table("mining_jobs").update(
        {"conformance_result": result}
    ).eq("id", job_id).execute()

    return result


@router.get("/result/{job_id}")
def get_conformance_result(
    job_id: str,
    _token: str = Security(verify_token),
):
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    resp = supabase.table("mining_jobs").select("conformance_result").eq("id", job_id).maybe_single().execute()
    if resp is None or not resp.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden")

    result = resp.data.get("conformance_result")
    if not result:
        raise HTTPException(status_code=404, detail="Geen conformance resultaat gevonden — voer eerst een check uit")

    return result
