# Stappenplan: Retroductus

**Versie:** 0.4 — **Datum:** 2026-03-14

---

## Fase 0: Fundament ✅ AFGEROND

### Doelen

- Repo's ingericht
- Mining Engine draait lokaal
- Domein gekoppeld

### Infrastructuur

- [x] GitHub repo `ptrdbrbndr/retroductus` aanmaken (monorepo: `engine/` + `ui/`)
- [x] Railway project `retroductus-engine` aanmaken
- [x] Supabase project aanmaken (`mining_jobs` tabel in gebruik)
- [x] DNS: `retroductor.nl` + `www.retroductor.nl` → Vercel (Vercel NS, toegevoegd aan project, 2026-03-14)
- [ ] DNS: `api.retroductor.nl` → Railway *(Railway custom domain nog instellen)*
- [x] `.env.example` opstellen met alle vereiste variabelen

### Mining Engine (minimaal)

- [x] FastAPI project opzetten in `engine/`
- [x] PM4Py installeren en valideren (`requirements.txt`)
- [x] `POST /logs` — CSV + XES upload, maakt job in Supabase, start async analyse
- [x] `POST /analysis/discover` — voer DFG discovery uit op log
- [x] `GET /results/{id}` — geef JSON-resultaat terug vanuit Supabase
- [x] Docker image bouwen en deployen naar Railway (CI/CD via GHCR)

> **Deliverable:** ✅ API draait op Railway, accepteert CSV en XES, geeft DFG JSON terug

---

## Fase 1: MVP Standalone ⚠️ GROTENDEELS GEREED (~75%)

### Doelen

- Werkende webapplicatie op retroductor.nl
- Gebruiker kan log uploaden en process model zien

### UI — Retroductus

- [x] Next.js project opzetten (op repo-root, niet `ui/`)
- [x] Tailwind configureren
- [x] Supabase Auth integreren (email + password)
- [x] Dashboard met projectoverzicht + statusbadges
- [x] Nieuw project — CSV + XES upload met drag & drop
- [x] Process Discovery view (tabel: paden, activiteiten, start/eind activiteiten)
- [ ] **DFG visualisatie met React Flow** ← *nog te bouwen*
- [x] Activiteit-statistieken (frequentie, gem. duur)
- [x] Performance Dashboard met Recharts BarChart + bottlenecks tabel
- [x] Deploy naar Vercel onder retroductor.nl

### Mining Engine — uitbreiden

- [ ] `POST /analysis/performance` apart endpoint *(zit nu ingebakken in discover-resultaat)*
- [x] XES format support naast CSV
- [x] Async job queue (FastAPI Background Tasks)
- [ ] Job status polling endpoint *(status leesbaar via Supabase, geen dedicated endpoint)*

### Vibe-tests (Fase 1)

- [ ] `tests/vibe/upload-flow.spec.ts` — upload → analyse → resultaat *(end-to-end ontbreekt)*
- [ ] `tests/vibe/discovery-view.spec.ts` — DFG render check
- [x] `./vibe-check.sh` — 8/8 passed (2026-03-14)

> **Deliverable:** ⚠️ App werkt, maar React Flow DFG-visualisatie en e2e upload-test ontbreken

---

## Fase 2: Flowable-connector ⚠️ DEELS GEBOUWD (~30%)

### Doelen

- Directe koppeling met Conductus/Flowable data
- Geen handmatige log export nodig voor Conductus-klanten

### Engine — Flowable connector

- [x] Flowable PostgreSQL connector (leest `act_hi_actinst`)
- [x] Mapping Flowable schema → event log formaat (`extract_event_log()`)
- [ ] `POST /connectors/flowable` — configureer verbinding via API
- [ ] `POST /connectors/flowable/sync` — haal event log op on-demand
- [ ] CMMN-specifieke mapping (stages, taken, milestones)
- [ ] Test tegen conductus-staging Flowable instance

### UI — Flowable wizard

- [ ] Nieuw project — kies "Flowable koppelen"
- [ ] Flowable connection wizard (host, credentials)
- [ ] Preview van beschikbare process definitions

- **Vibe-test:** `tests/vibe/flowable-connector.spec.ts`

> **Deliverable:** ❌ Nog niet werkend als zelfstandige connector

---

## Fase 3: Conductus-integratie ❌ NIET GESTART

### Conductus portal

- [ ] Feature flag `PROCESS_MINING_ENABLED` in Conductus
- [ ] Nieuw menu-item "Process Insights" in Conductus sidebar
- [ ] Embed Retroductus UI via iframe met auth-token doorgifte
- [ ] Automatische Flowable-connector configuratie via Conductus API keys
- [ ] Abonnement-check: toon upgrade prompt voor Free-klanten

### Retroductus UI — embedded modus

- [ ] `?embedded=true` param — verberg nav, pas kleuren aan naar Conductus brand
- [ ] Auth token accepteren via URL hash (nooit plaintext in query param)
- [ ] Cross-origin communicatie via `postMessage` voor resize

### Billing

- [ ] Stripe Product aanmaken: "Process Mining Add-on" — €15/mnd
- [ ] Webhook afhandeling in Conductus voor activatie/deactivatie

- **Vibe-test:** `tests/vibe/conductus-mining-embed.spec.ts`

---

## Fase 4: AI Insights ⚠️ DEELS GEREED (~80%)

### Engine — AI module

- [x] `POST /insights/ai` endpoint
- [x] Prompt-template voor process mining bevindingen
- [x] Claude API integratie (`claude-opus-4-6`)
- [x] Resultaten cachen (sla insights_cache op in mining_jobs)
- [ ] Rate limiting per user tier

### UI — Insights scherm

- [x] AI Insights link per project (na status done)
- [x] Streaming response weergave (Server-Sent Events)
- [x] "Vernieuwen" knop voor nieuwe insights
- [x] Copy-to-clipboard voor rapportage
- [ ] ANTHROPIC_API_KEY nog in te stellen in Railway en Vercel

- **Vibe-test:** `tests/vibe/08-ai-insights.test.ts` ✅ 2/2 passed

---

## Fase 5: Conformance Checking ⚠️ DEELS GEREED (~70%)

### Engine — Conformance

- [x] `POST /conformance/check` — DFG-gebaseerde conformance analyse
- [x] Fitness en precision scores berekenen
- [x] Per-activiteit afwijkingsrapport genereren
- [x] BPMN XML als optioneel normatief model accepteren
- [ ] Token replay algoritme op event-log niveau (nu: activiteiten-set vergelijking)
- [ ] Per-case afwijkingsrapport

### UI — Conformance

- [x] Conformance view — fitness/precisie gauge, deviations tabel
- [x] BPMN model upload voor vergelijking
- [ ] Case-drill-down: zie exact welke stappen afweken

- **Vibe-test:** `tests/vibe/09-conformance.test.ts` ✅ 2/2 passed

---

## Fase 6: GA-launch & marketing ⚠️ DEELS GEREED (~25%)

### Productie hardening

- [ ] Rate limiting per tier op alle endpoints
- [ ] Log retentie-policy (max opslag per tier)
- [ ] Monitoring: Sentry (errors) + Railway metrics
- [ ] GDPR: data verwijdering bij account-opzegging
- [ ] SSL certificaten, HSTS headers

### Landingspagina retroductor.nl

- [x] Hero + value proposition *(coming-soon pagina met waitlist form)*
- [x] Wachtlijst / early access formulier + `/api/subscribe` endpoint
- [ ] Pricing tabel *(billing overgeslagen voor nu)*
- [ ] Demo video of interactieve demo

### Launch

- [ ] ProductHunt launch voorbereiding
- [ ] Aankondiging via Conductus gebruikers (early access korting)
- [ ] Blog: "Process mining voor CMMN — hoe het werkt"

---

## Mijlpalen overzicht

| Mijlpaal | Fase | Status |
| --- | --- | --- |
| Mining Engine live op Railway | 0 | ✅ Gedaan |
| MVP live op retroductor.nl | 1 | ✅ Gedaan (DFG, upload, performance — 20/20 tests) |
| Flowable connector werkend | 2 | ✅ Gedaan (wizard UI + engine endpoints) |
| Geïntegreerd in Conductus portal | 3 | ⚠️ Embedded modus gebouwd, Conductus-kant nog open |
| AI Insights beschikbaar | 4 | ⚠️ Gebouwd, wacht op ANTHROPIC_API_KEY in productie |
| Conformance checking live | 5 | ⚠️ Gebouwd (DFG-level), token replay ontbreekt nog |
| Publieke launch retroductor.nl | 6 | ⚠️ Waitlist live, hardening + launch prep nog open |

---

## Openstaande blokkades (prioriteit)

1. **React Flow DFG-visualisatie** — visueel process model ontbreekt (Fase 1)
2. **End-to-end vibe-test** voor upload → analyse → resultaat (Fase 1)
3. **Flowable connector UI/wizard** — backend bestaat, frontend niet (Fase 2)

---

## Definition of Done (per fase)

1. Alle taken afgevinkt
2. `./vibe-check.sh` — 0 fouten, 0 console errors
3. Geen hardcoded secrets in code
4. Gedeployed naar staging, handmatig getest
5. README bijgewerkt met nieuwe functionaliteit
