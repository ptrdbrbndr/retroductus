import os
import json
import hashlib
from fastapi import APIRouter, Security, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from supabase import create_client

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False

router = APIRouter()
security = HTTPBearer()

MINING_ENGINE_SECRET = os.getenv("MINING_ENGINE_SECRET", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

PROMPT_TEMPLATE = """Je bent een expert process mining consultant. Analyseer de volgende resultaten van een DFG (Directly-Follows Graph) process mining analyse en geef concrete, actionable insights in het Nederlands.

## Process Mining Resultaten

**Statistieken:**
- Aantal events: {event_count}
- Aantal cases: {case_count}
- Aantal unieke activiteiten: {activity_count}

**Start activiteiten:**
{start_activities}

**Eind activiteiten:**
{end_activities}

**Top activiteiten (frequentie):**
{top_nodes}

**Top paden (meest gevolgde routes):**
{top_edges}

## Jouw Analyse

Geef een gestructureerde analyse met:
1. **Samenvatting** — Wat voor type proces is dit? Wat zijn de kenmerken?
2. **Knelpunten** — Waar zijn mogelijke bottlenecks of problemen?
3. **Patronen** — Welke opvallende patronen zie je in de procesflow?
4. **Aanbevelingen** — Concrete verbeterpunten voor dit proces
5. **Quick wins** — Wat kan direct verbeterd worden?

Wees specifiek en gebruik de daadwerkelijke activiteitsnamen uit de data."""


def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not MINING_ENGINE_SECRET or credentials.credentials != MINING_ENGINE_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")


class InsightsRequest(BaseModel):
    job_id: str
    force_refresh: bool = False


def _build_prompt(result: dict) -> str:
    nodes = result.get("dfg_nodes", [])
    edges = result.get("dfg_edges", [])
    start_acts = result.get("start_activities", {})
    end_acts = result.get("end_activities", {})

    top_nodes = sorted(nodes, key=lambda n: n.get("count", 0), reverse=True)[:10]
    top_edges = sorted(edges, key=lambda e: e.get("count", 0), reverse=True)[:10]

    nodes_text = "\n".join(
        f"- {n.get('activity') or n.get('id', '?')}: {n.get('count', 0)}x"
        for n in top_nodes
    )
    edges_text = "\n".join(
        f"- {e.get('source') or e.get('from', '?')} → {e.get('target') or e.get('to', '?')}: {e.get('count', 0)}x"
        for e in top_edges
    )
    start_text = "\n".join(f"- {k}: {v}" for k, v in list(start_acts.items())[:5])
    end_text = "\n".join(f"- {k}: {v}" for k, v in list(end_acts.items())[:5])

    return PROMPT_TEMPLATE.format(
        event_count=result.get("event_count", "?"),
        case_count=result.get("case_count", "?"),
        activity_count=result.get("activity_count", len(nodes)),
        start_activities=start_text or "Onbekend",
        end_activities=end_text or "Onbekend",
        top_nodes=nodes_text or "Geen data",
        top_edges=edges_text or "Geen data",
    )


def _cache_key(job_id: str) -> str:
    return hashlib.sha256(f"insights:{job_id}".encode()).hexdigest()[:16]


@router.post("/ai")
def ai_insights(
    req: InsightsRequest,
    _token: str = Security(verify_token),
):
    if not ANTHROPIC_AVAILABLE:
        raise HTTPException(status_code=503, detail="Anthropic package not installed")
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY niet geconfigureerd")

    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    # Fetch job
    resp = supabase.table("mining_jobs").select("*").eq("id", req.job_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Job niet gevonden")

    job = resp.data
    if job.get("status") != "done":
        raise HTTPException(status_code=400, detail="Analyse nog niet afgerond")

    # Check cache (stored in job insights_cache field)
    if not req.force_refresh and job.get("insights_cache"):
        cached = job["insights_cache"]

        def stream_cached():
            yield f"data: {json.dumps({'text': cached, 'done': False})}\n\n"
            yield f"data: {json.dumps({'done': True, 'cached': True})}\n\n"

        return StreamingResponse(stream_cached(), media_type="text/event-stream")

    result = job.get("result") or {}
    prompt = _build_prompt(result)

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    full_text = []

    def stream_claude():
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                full_text.append(text)
                yield f"data: {json.dumps({'text': text, 'done': False})}\n\n"

        # Cache the full response
        complete = "".join(full_text)
        try:
            supabase.table("mining_jobs").update(
                {"insights_cache": complete}
            ).eq("id", req.job_id).execute()
        except Exception:
            pass

        yield f"data: {json.dumps({'done': True, 'cached': False})}\n\n"

    return StreamingResponse(stream_claude(), media_type="text/event-stream")
