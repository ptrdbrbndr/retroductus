# Architectuur: Retroductus

**Versie:** 0.1
**Datum:** 2026-03-13

---

## Overzicht

Retroductus bestaat uit drie componenten die onafhankelijk of gecombineerd kunnen draaien:

```
┌─────────────────────────────────────────────────────────┐
│                    RETRODUCTUS                          │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Retroductus │    │  Conductus   │                  │
│  │     UI       │    │   Portal     │                  │
│  │  (Next.js)   │    │  (Next.js)   │                  │
│  │retroductor.nl│    │ conductus.nl │                  │
│  └──────┬───────┘    └──────┬───────┘                  │
│         │                   │                           │
│         └─────────┬─────────┘                          │
│                   │ REST API                            │
│         ┌─────────▼─────────┐                          │
│         │   Mining Engine   │                          │
│         │  (FastAPI/PM4Py)  │                          │
│         │     Python        │                          │
│         └─────────┬─────────┘                          │
│                   │                                     │
│         ┌─────────▼─────────┐                          │
│         │    Storage        │                          │
│         │  (S3 + Postgres)  │                          │
│         └───────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

---

## Component 1: Mining Engine (retroductus-engine)

### Stack
- **Runtime:** Python 3.12
- **Framework:** FastAPI
- **Process Mining:** PM4Py 2.7.x
- **Container:** Docker (Railway of zelfstandig)
- **Storage:** S3-compatible (Supabase Storage of mijn.host)

### Verantwoordelijkheden
- Ontvangen en opslaan van event logs (XES, CSV, JSON)
- Uitvoeren van process discovery (DFG, Petri net, BPMN)
- Conformance checking (token replay, alignments)
- Performance metrics berekenen (doorlooptijden, wachttijden)
- Terugsturen van resultaten als JSON

### API Endpoints (MVP)

```
POST   /logs                    # Upload event log
GET    /logs/{id}               # Status van ingested log
GET    /logs/{id}/statistics    # Basis statistieken

POST   /analysis/discover       # Process discovery
POST   /analysis/conformance    # Conformance checking
POST   /analysis/performance    # Performance analyse

GET    /results/{id}            # Analyse-resultaat ophalen
GET    /results/{id}/bpmn       # BPMN XML export
GET    /results/{id}/svg        # Visualisatie als SVG

POST   /insights/ai             # Claude AI insights op resultaat
```

### Integratie met Flowable (Conductus)
Flowable slaat historische process data op in een `ACT_HI_*` schema in PostgreSQL. De engine kan direct query'en op:
- `ACT_HI_PROCINST` — process instances
- `ACT_HI_ACTINST` — activity instances (= events voor process mining)
- `ACT_HI_TASKINST` — taakuitvoeringen met tijdstempels en assignees

Dit maakt een directe Flowable-connector mogelijk zonder handmatig log-export.

### CMMN-specifieke aanpak
CMMN kent geen vaste procesvolgorde (het is case-driven). De mining engine behandelt CMMN-data als:
- **Case ID** = Flowable process instance ID
- **Activity** = CMMN stage of task naam
- **Timestamp** = start/end van `ACT_HI_ACTINST`
- **Resource** = assigned user

Dit produceert een geldige XES-event log die PM4Py kan verwerken.

---

## Component 2: Retroductus UI (retroductus-ui)

### Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS (gedeeld design token met Conductus)
- **Visualisatie:** React Flow (process graphs) + Recharts (metrics)
- **Hosting:** Vercel (retroductor.nl) of mijn.host (standalone)

### Schermen (MVP)

```
/                       Landingspagina (standalone product)
/app                    Dashboard — overzicht projecten
/app/projects/new       Nieuw project — log upload of connectie
/app/projects/[id]      Project detail
/app/projects/[id]/discovery    Process discovery view
/app/projects/[id]/conformance  Conformance view
/app/projects/[id]/performance  Performance dashboard
/app/projects/[id]/insights     AI insights
/app/settings           Account + API keys
```

### Insluitbaar in Conductus
De UI-module is ook als embedded component te gebruiken via:
- **iframe embed** — eenvoudigste integratie, voorzien van auth token via URL param
- **Next.js Module Federation** (toekomst) — seamless integratie in Conductus portal

---

## Component 3: Dataopslag

### Event Logs
- **Supabase Storage** (voor Conductus-geïntegreerde modus)
- **S3-compatible bucket bij mijn.host** (voor standalone retroductor.nl)
- Logs worden opgeslagen als gzip-gecomprimeerde XES of Parquet

### Metadata & Resultaten
- **PostgreSQL via Supabase** — projecten, gebruikers, analyse-jobs, resultaten
- Supabase RLS voor multi-tenant isolatie

### Projecten-schema (Postgres)

```sql
-- Projecten
projects (
  id uuid PRIMARY KEY,
  org_id uuid,            -- koppeling aan Conductus organisatie (optioneel)
  name text,
  source_type text,       -- 'upload' | 'flowable' | 'csv_url'
  created_at timestamptz
)

-- Geüploade logs
event_logs (
  id uuid PRIMARY KEY,
  project_id uuid,
  storage_path text,      -- pad in S3/Supabase Storage
  format text,            -- 'xes' | 'csv' | 'json'
  event_count int,
  uploaded_at timestamptz
)

-- Analyse-jobs
analysis_jobs (
  id uuid PRIMARY KEY,
  log_id uuid,
  type text,              -- 'discovery' | 'conformance' | 'performance'
  status text,            -- 'pending' | 'running' | 'done' | 'error'
  result_path text,       -- pad naar JSON-resultaat
  started_at timestamptz,
  completed_at timestamptz
)
```

---

## Deployment

### Standalone (retroductor.nl)

```
mijn.host DNS:
  retroductor.nl          → Vercel (Retroductus UI)
  api.retroductor.nl      → Railway (Mining Engine)

Railway:
  retroductus-engine      Python FastAPI container
  retroductus-db          PostgreSQL (of gebruik Supabase)
```

### Geïntegreerd in Conductus

```
conductus.nl/mining/*     → Retroductus UI (geembedded of apart tabblad)
mining-engine.railway.app → Mining Engine (sidecar service)

Bestaande Supabase DB:    Extra tabellen voor mining metadata
Bestaande Supabase Storage: Bucket 'event-logs' voor log opslag
```

---

## Beveiliging

- **API authenticatie:** JWT tokens (gedeeld met Conductus Supabase Auth)
- **Standalone auth:** Supabase Auth (email/password + magic link)
- **Multi-tenancy:** Supabase RLS op project-niveau
- **Geen opslag van gevoelige process-data buiten EU** — Frankfurt regio (Supabase + Railway EU)
- **Event logs** worden versleuteld at-rest in S3/Supabase Storage

---

## AI Insights integratie

De Mining Engine roept de Claude API aan met een gestructureerde prompt op basis van analyseresultaten:

```python
# Pseudo-code
def generate_insights(analysis_result: dict) -> str:
    prompt = f"""
    Je bent een process mining expert. Analyseer de volgende bevindingen:

    - Gemiddelde doorlooptijd: {analysis_result['avg_duration']}
    - Top 3 bottlenecks: {analysis_result['bottlenecks']}
    - Conformance fitness score: {analysis_result['fitness']}
    - Meest afwijkende activiteiten: {analysis_result['deviations']}

    Geef 3 concrete, prioritized aanbevelingen voor procesverbetering.
    """
    return claude_client.messages.create(
        model="claude-opus-4-6",
        messages=[{"role": "user", "content": prompt}]
    )
```

---

## Technische risico's & mitigaties

| Risico | Kans | Impact | Mitigatie |
|--------|------|--------|-----------|
| PM4Py AGPL licentieconflict | Laag | Hoog | Microservice-patroon — PM4Py draait geïsoleerd |
| Lange analysetijden voor grote logs | Middel | Middel | Asynchrone jobs, voortgangsindicator, limiet per tier |
| Flowable schema-wijzigingen bij updates | Laag | Middel | Abstractielaag in connector, getest tegen vaste Flowable versie |
| Supabase opslag kosten bij grote logs | Middel | Laag | Automatische compressie, retentiebeleid per tier |
| CMMN = non-deterministisch, moeilijk te minen | Hoog | Middel | Duidelijke communicatie: discovery toont observed paths, geen normatief model |
