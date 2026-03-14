# Stappenplan: Retroductus

**Versie:** 0.1
**Datum:** 2026-03-13

---

## Fase 0: Fundament (week 1–2)

### Doelen
- Repo's ingericht
- Mining Engine draait lokaal
- Domein gekoppeld

### Taken

**Infrastructuur**
- [ ] GitHub repo `ptrdbrbndr/retroductus` aanmaken (monorepo: `engine/` + `ui/`)
- [ ] Railway project `retroductus-engine` aanmaken
- [ ] Supabase project aanmaken (of extra tabellen in conductus DB)
- [ ] DNS bij mijn.host: `retroductor.nl` → Vercel, `api.retroductor.nl` → Railway
- [ ] `.env.example` opstellen met alle vereiste variabelen

**Mining Engine (minimaal)**
- [ ] FastAPI project opzetten in `engine/`
- [ ] PM4Py installeren en valideren (`requirements.txt`)
- [ ] Endpoint `POST /logs` — accepteer CSV upload, sla op in Supabase Storage
- [ ] Endpoint `POST /analysis/discover` — voer DFG discovery uit op log
- [ ] Endpoint `GET /results/{id}` — geef JSON-resultaat terug
- [ ] Docker image bouwen en deployen naar Railway

**Deliverable:** API draait op `api.retroductor.nl`, accepteert CSV, geeft DFG JSON terug

---

## Fase 1: MVP Standalone (week 3–6)

### Doelen
- Werkende webapplicatie op retroductor.nl
- Gebruiker kan log uploaden en process model zien

### Taken

**UI — Retroductus**
- [ ] Next.js project opzetten in `ui/`
- [ ] Tailwind configureren (deels gebaseerd op Conductus design tokens)
- [ ] Supabase Auth integreren (email + magic link)
- [ ] Scherm: Dashboard met projectoverzicht
- [ ] Scherm: Nieuw project — CSV upload
- [ ] Scherm: Process Discovery view
  - [ ] DFG visualisatie met React Flow
  - [ ] Activiteit-statistieken (frequentie, gem. duur)
- [ ] Scherm: Performance Dashboard
  - [ ] Doorlooptijd histogram (Recharts)
  - [ ] Top bottlenecks lijst
- [ ] Deploy naar Vercel onder retroductor.nl

**Mining Engine — uitbreiden**
- [ ] `POST /analysis/performance` — doorlooptijden, wachttijden
- [ ] XES format support naast CSV
- [ ] Async job queue (FastAPI Background Tasks)
- [ ] Job status polling endpoint

**Vibe-tests**
- [ ] `tests/vibe/upload-flow.spec.ts` — upload → analyse → resultaat
- [ ] `tests/vibe/discovery-view.spec.ts` — DFG render check
- [ ] `./vibe-check.sh` groen

**Deliverable:** Werkende MVP op retroductor.nl — upload CSV, zie process model

---

## Fase 2: Flowable-connector (week 7–9)

### Doelen
- Directe koppeling met Conductus/Flowable data
- Geen handmatige log export nodig voor Conductus-klanten

### Taken

**Engine — Flowable connector**
- [ ] Flowable PostgreSQL connector (lees `ACT_HI_ACTINST`)
- [ ] Mapping Flowable schema → XES event log formaat
- [ ] `POST /connectors/flowable` — configureer verbinding
- [ ] `POST /connectors/flowable/sync` — haal event log op
- [ ] CMMN-specifieke mapping (stages, taken, milestones)
- [ ] Test tegen conductus-staging Flowable instance

**UI — connector flow**
- [ ] Scherm: Nieuwe project — kies "Flowable koppelen"
- [ ] Flowable connection wizard (host, credentials)
- [ ] Preview van beschikbare process definitions

**Vibe-tests**
- [ ] `tests/vibe/flowable-connector.spec.ts`

**Deliverable:** Conductus-klant kan direct Flowable koppelen zonder CSV export

---

## Fase 3: Conductus-integratie (week 10–13)

### Doelen
- Retroductus ingebouwd in Conductus portal
- Toegankelijk voor Conductus Pro/Business klanten als add-on

### Taken

**Conductus portal**
- [ ] Feature flag `PROCESS_MINING_ENABLED` in Conductus
- [ ] Nieuw menu-item "Process Insights" in Conductus sidebar
- [ ] Embed Retroductus UI via iframe met auth-token doorgifte
- [ ] Automatische Flowable-connector configuratie via Conductus API keys
- [ ] Abonnement-check: toon upgrade prompt voor Free-klanten

**Retroductus UI — embedded modus**
- [ ] `?embedded=true` param — verberg nav, pas kleuren aan naar Conductus brand
- [ ] Auth token accepteren via URL hash (nooit plaintext in query param)
- [ ] Cross-origin communicatie via `postMessage` voor resize

**Billing**
- [ ] Stripe Product aanmaken: "Process Mining Add-on" — €15/mnd
- [ ] Webhook afhandeling in Conductus voor activatie/deactivatie

**Vibe-tests**
- [ ] `tests/vibe/conductus-mining-embed.spec.ts`

**Deliverable:** Conductus Pro-klanten kunnen process mining inschakelen

---

## Fase 4: AI Insights (week 14–16)

### Doelen
- Claude-gebaseerde uitleg en aanbevelingen per analyse
- Differentiator t.o.v. ProM en andere tools

### Taken

**Engine — AI module**
- [ ] `POST /insights/ai` endpoint
- [ ] Prompt-template voor process mining bevindingen
- [ ] Claude API integratie (`claude-opus-4-6`)
- [ ] Resultaten cachen (zelfde analyse → zelfde insights, tenzij vernieuwd)
- [ ] Rate limiting per user tier

**UI — Insights scherm**
- [ ] Scherm: AI Insights tab per project
- [ ] Streaming response weergave (Server-Sent Events)
- [ ] "Vernieuwen" knop voor nieuwe insights
- [ ] Copy-to-clipboard voor rapportage

**Vibe-tests**
- [ ] `tests/vibe/ai-insights.spec.ts`

**Deliverable:** "Vraag AI" knop geeft concrete verbeteraanbevelingen in gewone taal

---

## Fase 5: Conformance Checking (week 17–19)

### Doelen
- Vergelijk werkelijk procesverloop met normatief model
- Aantonen welke cases afwijken en waarom

### Taken

**Engine**
- [ ] `POST /analysis/conformance` — token replay algoritme
- [ ] Fitness en precision scores berekenen
- [ ] Per-case afwijkingsrapport genereren
- [ ] BPMN XML als normatief model accepteren (upload of Flowable definition)

**UI**
- [ ] Scherm: Conformance view — fitness gauge, deviations tabel
- [ ] Case-drill-down: zie exact welke stappen afweken
- [ ] BPMN model upload voor vergelijking

**Vibe-tests**
- [ ] `tests/vibe/conformance-check.spec.ts`

**Deliverable:** Klant ziet welke cases conform zijn en welke afwijken

---

## Fase 6: GA-launch & marketing (week 20–22)

### Doelen
- Publieke launch van retroductor.nl
- Eerste betalende klanten

### Taken

**Productie hardening**
- [ ] Rate limiting per tier op alle endpoints
- [ ] Log retentie-policy (max opslag per tier)
- [ ] Monitoring: Sentry (errors) + Railway metrics
- [ ] GDPR: data verwijdering bij account-opzegging
- [ ] SSL certificaten, HSTS headers

**Landingspagina retroductor.nl**
- [ ] Hero + value proposition
- [ ] Pricing tabel (Free / Starter / Pro)
- [ ] Demo video of interactieve demo
- [ ] Wachtlijst / early access formulier

**Launch**
- [ ] ProductHunt launch voorbereiding
- [ ] Aankondiging via Conductus gebruikers (early access korting)
- [ ] Blog: "Process mining voor CMMN — hoe het werkt"

---

## Risico-buffer

Wekelijks 2–4 uur buffer inplannen voor:
- PM4Py library updates/breaking changes
- Flowable schema-discrepanties
- Supabase Storage quota issues bij test-data
- Browser-compatibiliteit van React Flow visualisaties

---

## Mijlpalen overzicht

| Mijlpaal | Fase | Verwacht |
|----------|------|---------|
| Mining Engine live op Railway | 0 | Week 2 |
| MVP live op retroductor.nl | 1 | Week 6 |
| Flowable connector werkend | 2 | Week 9 |
| Geïntegreerd in Conductus portal | 3 | Week 13 |
| AI Insights beschikbaar | 4 | Week 16 |
| Conformance checking live | 5 | Week 19 |
| Publieke launch retroductor.nl | 6 | Week 22 |

---

## Definition of Done (per fase)

1. Alle taken afgevinkt
2. `./vibe-check.sh` — 0 fouten, 0 console errors
3. Geen hardcoded secrets in code
4. Gedeployed naar staging, handmatig getest
5. README bijgewerkt met nieuwe functionaliteit
