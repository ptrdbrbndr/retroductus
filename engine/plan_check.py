"""
Server-side plan-check voor Pro/Enterprise features.

Gebruik:
    from plan_check import require_pro_plan

    @router.post("/insights/ai")
    async def ai_insights(req: InsightsRequest, user_id: str = Depends(require_pro_plan)):
        ...
"""

import os
import logging

from fastapi import Depends, HTTPException, Security
from supabase import create_client

from auth import verify_token

logger = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

PRO_PLANS = {"pro", "enterprise"}


async def get_user_plan(user_id: str) -> str:
    """
    Haalt het abonnementsplan op voor de gebruiker uit de Supabase database.
    Geeft 'free' terug als er geen plan gevonden wordt.
    Service-to-service tokens (__service__) krijgen 'pro' plan.
    """
    if user_id == "__service__":
        return "pro"

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    try:
        resp = (
            supabase.table("user_plans")
            .select("plan")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )
        if resp and resp.data:
            return resp.data.get("plan", "free")
    except Exception as exc:
        logger.warning("Kon plan niet ophalen voor gebruiker %s: %s", user_id, exc)

    return "free"


async def require_pro_plan(
    user_id: str = Security(verify_token),
) -> str:
    """
    FastAPI dependency: vereist Pro of Enterprise plan.
    Gooit HTTPException 403 bij een gratis plan.
    """
    plan = await get_user_plan(user_id)
    if plan not in PRO_PLANS:
        raise HTTPException(
            status_code=403,
            detail="AI Insights is alleen beschikbaar in het Pro plan. Upgrade om toegang te krijgen.",
        )
    return user_id
