# Stappenplan Security & Kwaliteit — Retroductus
> Gegenereerd op basis van security review 2026-03-14
> Gebruik dit als werkopdracht: "Voer stap [N] uit van het Retroductus stappenplan"
> ℹ️ Project is verder dan verwacht: Fase 1-6 al deels gebouwd. Security hardening is nu de bottleneck.

---

## STAND VAN ZAKEN

De review toont dat Retroductus verder is dan gedacht (70-80% feature-complete). De volgende stappen zijn gericht op het afronden van Fase 1 en het beveiligen van de bestaande code voordat er nieuwe features worden toegevoegd.

---

## PRIORITEIT 1 — KRITIEK (FUNDAMENT, doe dit eerst)

### Stap 1 — Multi-tenant RLS implementeren
**Probleem:** Supabase tabellen missen RLS-policies die isolatie per organisatie afdwingen. Zonder dit kan Org A data van Org B zien.

**Uitvoeren:**
Maak nieuwe migratie `supabase/migrations/XXX_rls_tenant_isolation.sql`:
```sql
-- Controleer eerst welke tabellen bestaan
-- Voeg toe aan elke tabel met organisatie-data:

ALTER TABLE mining_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gebruiker ziet alleen eigen jobs"
  ON mining_jobs FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gebruiker ziet alleen eigen projecten"
  ON projects FOR ALL
  USING (user_id = auth.uid() OR organisation_id IN (
    SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
  ));

-- Herhaal voor alle tabellen met gebruikersdata
```

**Verificatie:** Vibe-test: ingelogde gebruiker kan jobs van andere gebruiker niet ophalen

---

### Stap 2 — FastAPI auth middleware op alle endpoints
**Probleem:** FastAPI endpoints missen JWT-validatie. Iedereen met de engine URL kan analyses aanvragen.
**Bestand:** `engine/` directory

**Uitvoeren:**
1. Voeg Supabase JWT validatie toe als FastAPI dependency:
```python
# engine/auth.py
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import jwt
import httpx

security = HTTPBearer()

async def get_current_user(credentials = Depends(security)):
    token = credentials.credentials
    try:
        # Valideer tegen Supabase JWKS
        payload = jwt.decode(token, options={"verify_signature": False})
        # TODO: Valideer handtekening via Supabase public key
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")
```

2. Voeg `Depends(get_current_user)` toe aan alle routers:
```python
@router.post("/discover")
async def discover(request: DiscoverRequest, user = Depends(get_current_user)):
    ...
```

---

### Stap 3 — Pydantic input validatie + schone error responses
**Probleem:** Python tracebacks kunnen naar de client lekken. Input niet volledig gevalideerd.

**Uitvoeren:**
1. Voeg global exception handler toe in `engine/main.py`:
```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # Log intern:
    logger.error(f"Onverwachte fout: {exc}", exc_info=True)
    # Stuur generiek naar client:
    return JSONResponse(status_code=500, content={"detail": "Interne serverfout"})
```

2. Controleer alle Pydantic modellen op volledigheid:
```python
class DiscoverRequest(BaseModel):
    project_id: UUID
    log_path: str = Field(..., max_length=500)
    # Geen arbitraire string-injectie mogelijk
```

---

### Stap 4 — Bestandsupload validatie
**Probleem:** Geen type- en groottevalidatie op geüploade event logs (XES/CSV).

**Uitvoeren:**
```python
# engine/routers/logs.py
ALLOWED_TYPES = {'text/csv', 'application/xml', 'text/xml'}
MAX_FILE_SIZE = {
    'free': 10 * 1024 * 1024,    # 10MB
    'starter': 100 * 1024 * 1024, # 100MB
    'pro': 1024 * 1024 * 1024,   # 1GB
}

@router.post("/upload")
async def upload_log(file: UploadFile, user = Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Alleen CSV en XES bestanden toegestaan")

    # Lees in chunks om grootte te controleren
    user_plan = await get_user_plan(user['sub'])
    max_size = MAX_FILE_SIZE.get(user_plan, MAX_FILE_SIZE['free'])

    content = b''
    async for chunk in file:
        content += chunk
        if len(content) > max_size:
            raise HTTPException(413, f"Bestand te groot voor {user_plan} plan")
```

---

## PRIORITEIT 2 — HOOG

### Stap 5 — React Flow DFG visualisatie (Fase 1 blocker)
**Probleem:** `@xyflow/react` is geïnstalleerd maar niet geïmplementeerd. Dit blokkeert de MVP.
**Bestand:** Frontend `src/` — component ontbreekt

**Uitvoeren:**
1. Maak `src/components/DFGVisualisatie.tsx`:
```tsx
import ReactFlow, { Node, Edge } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

interface DFGVisualisatieProps {
  nodes: { id: string; label: string; frequency: number }[]
  edges: { source: string; target: string; frequency: number }[]
}

export function DFGVisualisatie({ nodes, edges }: DFGVisualisatieProps) {
  const rfNodes: Node[] = nodes.map((n, i) => ({
    id: n.id,
    data: { label: `${n.label}\n(${n.frequency}x)` },
    position: { x: (i % 4) * 200, y: Math.floor(i / 4) * 100 },
  }))
  const rfEdges: Edge[] = edges.map(e => ({
    id: `${e.source}-${e.target}`,
    source: e.source,
    target: e.target,
    label: String(e.frequency),
  }))
  return <ReactFlow nodes={rfNodes} edges={rfEdges} fitView />
}
```
2. Integreer in de analysis results pagina

**Verificatie:** Vibe-test: na upload en analyse wordt een DFG diagram getoond

---

### Stap 6 — Rate limiting op mining endpoints
**Probleem:** Zware PM4Py operaties hebben geen per-user quota — één gebruiker kan Railway platleggen.

**Uitvoeren:**
```python
# engine/rate_limit.py
from fastapi import HTTPException
import time
from collections import defaultdict

request_counts = defaultdict(list)

def check_rate_limit(user_id: str, max_requests: int = 5, window: int = 60):
    now = time.time()
    requests = request_counts[user_id]
    requests = [r for r in requests if now - r < window]
    if len(requests) >= max_requests:
        raise HTTPException(429, "Te veel mining requests. Wacht even.")
    requests.append(now)
    request_counts[user_id] = requests
```

---

### Stap 7 — Plan-check server-side (Pro feature gating)
**Probleem:** AI Insights is een Pro-feature maar er is geen server-side check of de gebruiker een Pro-abonnement heeft.

**Uitvoeren:**
```python
# engine/plan_check.py
async def require_pro_plan(user = Depends(get_current_user)):
    plan = await get_user_plan(user['sub'])
    if plan not in ('pro', 'enterprise'):
        raise HTTPException(403, "AI Insights is alleen beschikbaar in het Pro plan")
    return user

@router.post("/insights/ai")
async def ai_insights(request: InsightsRequest, user = Depends(require_pro_plan)):
    ...
```

---

### Stap 8 — Timeout afdwingen op mining jobs
**Probleem:** PM4Py analyses op grote event logs kunnen uren duren en Railway vastlopen.

**Uitvoeren:**
```python
import asyncio

async def run_with_timeout(coro, timeout_seconds: int = 60):
    try:
        return await asyncio.wait_for(coro, timeout=timeout_seconds)
    except asyncio.TimeoutError:
        raise HTTPException(408, "Analyse timeout bereikt. Probeer met een kleiner event log.")
```

---

### Stap 9 — Prompt injection preventie voor Claude API
**Probleem:** Event log data mag niet als directe user-input naar Claude worden gestuurd.

**Uitvoeren:**
```python
# Stuur alleen geaggregeerde statistieken, NOOIT ruwe event data
def prepare_ai_context(analysis_result: dict) -> str:
    return f"""Je analyseert een businessproces op basis van mining resultaten.

STATISTIEKEN:
- Aantal activiteiten: {analysis_result['activity_count']}
- Aantal traces: {analysis_result['trace_count']}
- Gemiddelde doorlooptijd: {analysis_result['avg_duration']}
- Top 5 bottlenecks: {analysis_result['top_bottlenecks']}

Geef advies over procesverbetering op basis van bovenstaande statistieken."""
# NOOIT: f"Analyseer deze event data: {raw_event_log_content}"
```

---

### Stap 10 — Secrets en .env opruimen
**Probleem:** `.env.local` bevat `MINING_ENGINE_SECRET`. Geen volledig `.env.example` op root-niveau.

**Uitvoeren:**
1. Controleer `.gitignore` bevat `.env.local`
2. Maak `.env.example` aan op root-niveau:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mining Engine
MINING_ENGINE_URL=https://api.retroductor.nl
MINING_ENGINE_SECRET=

# AI (Pro plan)
ANTHROPIC_API_KEY=
```
3. Voeg `ANTHROPIC_API_KEY` toe aan Railway environment variables

---

## PRIORITEIT 3 — MEDIUM / JURIDISCH

### Stap 11 — Verwerkersovereenkomst (DPA)
**Probleem:** Klanten uploaden bedrijfseigen event logs. Dit is persoons- en bedrijfsvertrouwelijke data. DPA nodig voor B2B.

**Uitvoeren:**
1. Stel DPA-template op (juridisch document)
2. Voeg DPA-acceptatie toe aan registratieflow voor betaalde plannen
3. Sluit DPA af met Supabase en Vercel

---

### Stap 12 — E2E vibe-test upload → analyse → resultaat
**Probleem:** Handmatige flow werkt, maar geen geautomatiseerde test.

**Uitvoeren:**
Voeg toe aan `tests/vibe/` een test die:
1. Inlogt
2. CSV/XES bestand uploadt
3. Analyse start
4. Wacht op resultaat
5. Controleert DFG-visualisatie is getoond
6. `vibeCheck('analyse-resultaat-getoond')` aanroept

---

## STATUS OVERZICHT

| Stap | Prioriteit | Complexiteit | Status |
|------|-----------|-------------|--------|
| 1. Multi-tenant RLS | KRITIEK | M | ✅ 2026-03-14 |
| 2. FastAPI JWT auth | KRITIEK | M | ✅ 2026-03-14 |
| 3. Pydantic + error handling | KRITIEK | S | ✅ 2026-03-14 |
| 4. Bestandsupload validatie | KRITIEK | S | ✅ 2026-03-14 |
| 5. React Flow DFG (Fase 1) | HOOG | M | ✅ al geïmplementeerd |
| 6. Rate limiting engine | HOOG | S | ✅ 2026-03-14 |
| 7. Plan-check Pro features | HOOG | S | ✅ 2026-03-14 |
| 8. Mining job timeout | HOOG | S | ✅ 2026-03-14 |
| 9. Prompt injection preventie | HOOG | S | ✅ 2026-03-14 |
| 10. Secrets/.env opruimen | HOOG | S | ✅ 2026-03-14 |
| 11. DPA opstellen | JURIDISCH | L | ❌ handmatig uitvoeren |
| 12. E2E vibe-test | MEDIUM | M | ✅ 2026-03-14 |
