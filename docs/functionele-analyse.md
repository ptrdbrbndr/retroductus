# Functionele Analyse: Retroductus Analyse-applicatie

**Versie:** 1.0
**Datum:** 2026-03-16
**Auteur:** Pieter de Brabander
**Status:** Concept

---

## 1. Inleiding

### 1.1 Doelstelling

Dit document beschrijft de functionele werking van de Retroductus analyse-applicatie. Retroductus stelt organisaties in staat om op basis van werkelijke eventlog-data inzicht te krijgen in hoe hun processen verlopen, waar knelpunten zitten en hoe verbeteringen doorgevoerd kunnen worden.

### 1.2 Scope

De analyse-applicatie omvat:

- **Retroductus UI** — webapplicatie op retroductor.nl (Next.js)
- **Mining Engine** — process mining backend (Python/FastAPI/PM4Py)
- **Conductus-integratie** — embedded module binnen conductus.nl

Buiten scope: de Conductus CMMN-engine zelf, Stripe-betalingsverwerking, DNS-beheer.

### 1.3 Relatie tot andere systemen

```
┌─────────────────────────────────────────────────┐
│                    CONTEXT                       │
│                                                  │
│  Flowable DB ──► Retroductus ◄── Upload (XES/CSV)│
│                      │                           │
│                  Conductus                       │
│               (optionele integratie)             │
│                      │                           │
│               Claude API (AI)                    │
└─────────────────────────────────────────────────┘
```

---

## 2. Actoren

| Actor | Beschrijving | Toegang |
|-------|-------------|---------|
| **Anonieme bezoeker** | Bezoekt retroductor.nl zonder account | Landingspagina, registratie |
| **Free gebruiker** | Geregistreerd, gratis tier | 1 project, max 10.000 events |
| **Starter gebruiker** | Betaald €29/mnd | 5 projecten, max 100.000 events, PDF exports |
| **Pro gebruiker** | Betaald €79/mnd | Onbeperkt, AI insights, team-toegang, API |
| **Conductus-klant** | Gebruikt Conductus + Mining add-on (+€15/mnd) | Mining module binnen Conductus portal |
| **Tenant Owner** | Beheerder van een Conductus-organisatie | Feature toggles, admin-dashboard |

---

## 3. Functionele modules

De applicatie bestaat uit vier kernmodules, plus ondersteunende functionaliteit.

### 3.1 Module 1 — Datainvoer (Event Log Ingestie)

**Doel:** de gebruiker aanleveren van procesdata aan de analyse-engine.

#### 3.1.1 Upload van event log

De gebruiker laadt een bestand op met historische procesdata.

**Ondersteunde formaten:**
- **XES** (IEEE standaard voor process mining) — meest uitgebreid, bevat attributen per event
- **CSV** — minimaal: kolommen `case_id`, `activity`, `timestamp`; optioneel: `resource`, `cost`
- **JSON** — gestructureerde array van events

**Validatie (server-side):**
- Bestandsgrootte: max per tier (Free: 10MB, Starter: 100MB, Pro: onbeperkt)
- Verplichte kolommen aanwezig
- Timestamps parseerbaar (ISO 8601)
- Geen persoonlijke data in URL of query string

**Opslag:**
- Gzip-gecomprimeerd in S3-compatible storage (Supabase Storage of mijn.host)
- Versleuteld at-rest
- Pad opgeslagen in `event_logs.storage_path`

#### 3.1.2 Directe Flowable-koppeling (Conductus-modus)

Wanneer de gebruiker Conductus gebruikt, kan de engine direct de Flowable-historiedatabase uitvragen zonder handmatige export.

**Geextraheerde velden:**

| Bron (Flowable) | Meaning voor mining |
|-----------------|---------------------|
| `ACT_HI_PROCINST.proc_inst_id_` | Case ID |
| `ACT_HI_ACTINST.act_name_` | Activiteitnaam |
| `ACT_HI_ACTINST.start_time_` | Starttijdstip event |
| `ACT_HI_ACTINST.end_time_` | Eindtijdstip event |
| `ACT_HI_TASKINST.assignee_` | Uitvoerende resource |
| `tenant_id_` | Multi-tenant filtering |

**CMMN-specifiek:** CMMN kent geen vaste volgorde. De engine behandelt CMMN-data als *observed paths*, niet als normatief model. Dit wordt expliciet gecommuniceerd in de UI.

#### 3.1.3 Projectbeheer

- Een gebruiker maakt een **project** aan als container voor gerelateerde event logs en analyses
- Per project: naam, brontype (`upload` | `flowable` | `csv_url`), aanmaakdatum
- Free tier: max 1 project; Starter: max 5; Pro: onbeperkt

---

### 3.2 Module 2 — Process Discovery

**Doel:** automatisch het werkelijke procesverloop ontdekken en visualiseren.

#### 3.2.1 Analyse starten

De gebruiker start een discovery-analyse op een geïngested event log. De job wordt asynchroon verwerkt (status: `pending → running → done | error`).

#### 3.2.2 Direct-Follows Graph (DFG)

- **Wat:** een gerichte graaf die toont welke activiteiten direct na elkaar voorkomen
- **Hoe:** PM4Py berekent frequentie en gemiddelde duur per transitie
- **Weergave:** nodes = activiteiten, pijlen = transities, dikte = frequentie, kleur = gemiddelde doorlooptijd
- **Interactie:** klikken op een node toont detailstatistieken voor die activiteit

#### 3.2.3 Procesmodel exporteren

- **SVG** — vectorafbeelding van de graaf (alle tiers)
- **BPMN XML** — exporteerbaar procesmodel (Starter en Pro)
- **PDF rapport** — samengesteld overzicht (Starter en Pro)

#### 3.2.4 Vergelijking ontdekt vs. normatief model

Pro-gebruikers kunnen een normatief BPMN-model uploaden ter vergelijking. Het ontdekte model wordt naast het normatieve model getoond met gemarkeerde afwijkingen.

---

### 3.3 Module 3 — Conformance Checking

**Doel:** vaststellen in hoeverre werkelijke uitvoeringen overeenkomen met het gewenste procesmodel.

#### 3.3.1 Fitness-score

- **Fitness (0–1):** hoeveel van de werkelijke uitvoeringen passen in het normatieve model
- **Precision (0–1):** hoeveel van de mogelijke modelpaden zijn ook werkelijk gebruikt
- **F1-score:** harmonisch gemiddelde van fitness en precision

#### 3.3.2 Afwijkingen per case

- Lijst van cases gesorteerd op afwijkingsgraad
- Per case: welke stappen ontbreken, welke stappen zijn extra uitgevoerd, welke volgorde klopt niet
- Exporteerbaar als CSV

#### 3.3.3 Activiteitenanalyse

- Per activiteit: percentage correcte uitvoering, veelvoorkomende afwijkingen
- Heatmap op het procesmodel: rode activiteiten = hoogste afwijkingsfrequentie

---

### 3.4 Module 4 — Performance Analytics

**Doel:** doorlooptijden, bottlenecks en resource-gebruik inzichtelijk maken.

#### 3.4.1 Doorlooptijden

| Metriek | Beschrijving |
|---------|-------------|
| Gemiddelde case-doorlooptijd | Totale tijd van eerste tot laatste event per case |
| Mediaan case-doorlooptijd | Robuuster bij uitschieters |
| P90 doorlooptijd | 90% van cases afgerond binnen X tijd |
| Activiteit-doorlooptijd | Gemiddelde tijd per processtap |
| Wachttijd | Tijd tussen opeenvolgende activiteiten |

**Visualisatie:** histogram van case-doorlooptijden, timeline-view per individuele case.

#### 3.4.2 Bottleneck-detectie

- Automatische identificatie van activiteiten met de langste wachttijd vóór aanvang
- Bottlenecks gerangschikt op impact (wachttijd × frequentie)
- Weergave als heatmap op de DFG

#### 3.4.3 Resource-analyse

- Welke gebruiker/rol voert welke activiteit uit?
- Gemiddelde verwerkingstijd per resource per activiteit
- Workloadverdeling: hoeveel cases per resource actief?
- Alleen beschikbaar als het event log een `resource`-kolom bevat

#### 3.4.4 Tijdlijn-visualisatie per case

- Gantt-achtige weergave van één specifieke case
- Alle activiteiten op tijdas met start- en eindtijdstip
- Gebruikt voor root cause analysis bij uitschieters

---

### 3.5 Module 5 — AI Insights

**Doel:** analyseresultaten vertalen naar begrijpelijke, actiegerichte aanbevelingen in gewone taal.

#### 3.5.1 Automatische insights na analyse

Na elke voltooide analyse genereert de AI automatisch:
- Samenvatting van de bevindingen (3–5 zinnen)
- Top 3 meest impactvolle bottlenecks
- Top 3 aanbevelingen voor procesverbetering

**Techniek:** Mining Engine stuurt gestructureerde analysemetadata naar Claude API (`claude-opus-4-6`). Het antwoord wordt gestreamd naar de UI.

#### 3.5.2 Vrije vragen stellen (Pro)

Pro-gebruikers kunnen vrije vragen stellen over hun analyseresultaten:
- "Welke afdeling veroorzaakt de meeste vertraging?"
- "Wat is het meest afwijkende pad?"
- "Hoe verhoudt dit kwartaal zich tot het vorige?"

De context voor het antwoord is uitsluitend de analysedata van het huidige project — geen externe data.

#### 3.5.3 Rapport genereren (Pro)

- Samengesteld PDF-rapport met DFG, performance-metrics en AI-inzichten
- Geschikt voor presentatie aan stakeholders
- Bevat geen ruwe eventlog-data (privacybewust)

**Beschikbaarheid:** AI Insights is exclusief voor Pro-tier (retroductor.nl) en Business-tier (Conductus).

---

## 4. Ondersteunende functionaliteit

### 4.1 Authenticatie en autorisatie

- **Registratie/Login:** e-mailadres + wachtwoord, magic link (Supabase Auth)
- **Sessie:** JWT in httpOnly cookie (niet in localStorage)
- **Rollenbeheer:** binnen een team kunnen leden `viewer` of `admin` zijn
- **Feature-toegang:** gecontroleerd via `getTenantFeatures()` server-side — nooit client-side alleen

### 4.2 Teambeheer (Starter en Pro)

- Uitnodigen van teamleden via e-mail
- Roltoewijzing: `viewer` (alleen lezen) of `admin` (analyses starten, instellingen wijzigen)
- Teamleden zien dezelfde projecten binnen de organisatie

### 4.3 API-toegang (Pro)

Pro-gebruikers kunnen via REST API:
- Event logs uploaden programmatisch
- Analyses starten en status opvragen
- Resultaten ophalen als JSON

Authenticatie via API-sleutel (Bearer token), gegenereerd in accountinstellingen.

### 4.4 Meldingen en foutafhandeling

- Gebruikersfeedback in **gewone Nederlandse taal** — geen technische jargon
- Bij uploadfout: duidelijke melding over wat ontbreekt (bijv. "De kolom 'timestamp' ontbreekt in je bestand")
- Bij trage analyse (>30s): voortgangsindicator met schatting
- Bij mislukte AI-aanroep: graceful degradatie — analyse-resultaten tonen zónder AI-insights, met melding

---

## 5. Schermen en navigatie

```
/                           Landingspagina
  └── /auth/login           Inloggen
  └── /auth/signup          Registreren

/app                        Dashboard — projectoverzicht
  └── /app/projects/new     Nieuw project aanmaken
  └── /app/projects/[id]    Project detail
      ├── /discovery         Process Discovery view
      │     DFG-visualisatie, procesmodel, vergelijking
      ├── /conformance       Conformance Checking view
      │     Fitness-scores, afwijkingen per case
      ├── /performance       Performance Dashboard
      │     Doorlooptijden, bottlenecks, resources
      └── /insights          AI Insights
            Streaming antwoorden, rapport genereren

/app/settings               Account en API-instellingen
  └── /app/settings/team    Teambeheer
  └── /app/settings/billing Abonnement en add-ons
```

**Conductus-integratie** voegt toe aan het Conductus-dashboard:

```
/dashboard/mining           Mining overzicht (gated op feature flag)
  └── /dashboard/mining/[jobId]  Analyse-resultaten (tabbladen)
```

---

## 6. Niet-functionele vereisten

### 6.1 Prestaties

| Vereiste | Norm |
|----------|------|
| Analysetijd voor ≤ 50.000 events | < 5 seconden |
| UI laadtijd (eerste pagina) | < 2 seconden (LCP) |
| AI streaming eerste token | < 3 seconden |
| Uploadsnelheid | Geen throttling tot max tiergrootte |

### 6.2 Beveiliging (OWASP ASVS Level 1)

- Alle API-routes verifiëren authenticatie vóór verwerking
- Supabase RLS op projectniveau — gebruiker ziet alleen eigen projecten
- Event logs versleuteld at-rest (S3 server-side encryption)
- Geen persoonlijke data in URL of query string
- Mining Engine communicatie via shared secret (nooit blootgesteld aan browser)
- Rate limiting op analyse-endpoints

### 6.3 Privacy (AVG)

- Event logs kunnen persoonsgegevens bevatten (namen als resource) — behandeld als categorie "midden"
- Retentiebeleid: logs worden verwijderd 90 dagen na laatste toegang (instelbaar per Pro-account)
- Gebruiker kan account en alle bijbehorende data wissen
- Geen opslag buiten EU (Railway EU, Supabase Frankfurt)

### 6.4 Toegankelijkheid

- `aria-label` op alle icoon-knoppen
- Kleurblind-veilige kleurschemas voor heatmaps (geen rood/groen als enige onderscheid)
- Toetsenbordnavigeerbare interactieve grafieken

---

## 7. Datamodel (kernentiteiten)

```
Organization / Tenant
  └── Project (1..N per tier)
        └── EventLog (1..N per project)
              └── AnalysisJob (1..N per log)
                    ├── type: discovery | conformance | performance
                    ├── status: pending | running | done | error
                    └── Result
                          ├── DFG (JSON/SVG)
                          ├── Metrics (JSON)
                          └── AIInsight (tekst, gegenereerd)

User
  └── OrganizationMembership (rol: viewer | admin | owner)
```

---

## 8. Grenzen en aannames

### Wat het systeem WEL doet

- Analyseren van historische procesdata (event logs)
- Visualiseren van het werkelijke procesverloop
- Berekenen van prestatie- en conformancemetrieken
- Genereren van AI-gestuurde aanbevelingen

### Wat het systeem NIET doet

- Real-time process monitoring (niet in scope MVP)
- Aanpassen van processen (dat doet Conductus)
- Opslaan van ruwe persoonsdata anders dan benodigd voor analyse
- Garanties geven over de causaliteit van bevindingen (correlatief)

### Aannames

- Event logs zijn correct en volledig — de engine corrigt geen fouten in brondata
- CMMN-analyses produceren *observed paths*, geen normatieve modellen
- Flowable-connector vereist toegang tot de Flowable PostgreSQL-database (niet via REST API)

---

## 9. Open punten (voor Fase 1)

| # | Vraag | Impact |
|---|-------|--------|
| 1 | Maximale log-grootte voor async verwerking — wanneer job-queue nodig? | Architectuur |
| 2 | Hoe worden multi-versie-analyses vergeleken (v1 vs. v2 van hetzelfde proces)? | Scope |
| 3 | Exportformaat voor conformance-afwijkingen — CSV voldoende of ook XES? | UX |
| 4 | Retention policy configureerbaar per project of per organisatie? | Privacy/AVG |
| 5 | SSO/SAML-ondersteuning voor enterprise (Conductus Business)? | Roadmap |

---

*Functionele Analyse Retroductus v1.0 — 2026-03-16*
