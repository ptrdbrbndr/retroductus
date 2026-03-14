# Productvision: Retroductus

**Versie:** 0.1
**Datum:** 2026-03-13

---

## Naam & Identiteit

**Retroductus** — van het Latijn: *retro* (terug) + *ducere* (leiden). Waar Conductus processen voorwaarts leidt, kijkt Retroductus terug om te leren.

- **Platform:** retroductor.nl
- **Onderdeel van de Conductus-suite**, maar ook zelfstandig inzetbaar
- Tagline: *"Kijk terug. Stuur bij. Leid beter."*

---

## Probleemstelling

Organisaties die werken met case-gebaseerde processen (CMMN) — via Conductus of een ander systeem — hebben geen inzicht in:

- Hoe processen in de praktijk verlopen vs. hoe ze bedoeld zijn
- Waar vertragingen ontstaan (bottlenecks)
- Welke activiteiten het vaakst worden overgeslagen of herhaald
- Wie in het proces vertraging veroorzaakt (resource-analyse)
- Hoe processen verbeteren na wijzigingen

Process mining maakt dit inzichtelijk op basis van **werkelijke eventlog-data** uit het systeem.

---

## Doelgroep

### Primair: Conductus-klanten
- Organisaties die Conductus gebruiken voor CMMN-procesbeheer
- Behoefte aan analytics bovenop hun bestaande case-data
- Plan: Pro en Business tier (betaalde add-on)

### Secundair: Standalone markt
- Organisaties met een eigen procesbeheersysteem (Flowable, Camunda, SAP, etc.)
- Willen process mining zonder dure enterprise tools (Celonis, Signavio)
- Upload eigen event logs (XES, CSV) voor analyse
- Plan: SaaS op retroductor.nl, freemium model

---

## Kernfunctionaliteit (MVP)

### Module 1: Process Discovery
- Upload of koppel event log (XES, CSV, JSON)
- Automatische discovery van het werkelijke procesmodel
- Visualisatie als BPMN-diagram (DFG — Direct-Follows Graph)
- Vergelijking: ontdekt model vs. normatiefmodel

### Module 2: Conformance Checking
- Verifieer of werkelijke uitvoeringen overeenkomen met het gewenste model
- Identificeer afwijkingen per case
- Fitness- en precision-scores per processtap

### Module 3: Performance Analytics
- Doorlooptijden per activiteit en per case
- Bottleneck-detectie (waar wachten cases het langst?)
- Resource-analyse (wie voert welke stap uit, hoe snel?)
- Tijdlijn-visualisatie per case

### Module 4: AI Insights (differentiator)
- Claude API integratie voor natural language uitleg van bevindingen
- "Wat zijn de 3 grootste bottlenecks in dit proces?" → antwoord in gewone taal
- Suggesties voor procesverbetering
- Rapportgeneratie op basis van analyse-uitkomsten

---

## Differentiatie t.o.v. bestaande tools

| Aspect | Retroductus | Celonis | ProM | Apromore |
|--------|------------|---------|------|----------|
| Prijs | Freemium/betaalbaar | Enterprise (€100k+/jr) | Gratis (desktop) | Gearchiveerd |
| CMMN-integratie | Native (Conductus) | Nee | Nee | Nee |
| Web-gebaseerd | Ja | Ja | Nee | Ja |
| AI-inzichten | Ja (Claude) | Beperkt | Nee | Nee |
| Self-hostbaar | Ja | Nee | Ja | Ja (verouderd) |
| Standalone + integreerbaar | Ja | Nee | Nee | Nee |

---

## Businessmodel

### Retroductus Standalone (retroductor.nl)
| Tier | Prijs | Limieten |
|------|-------|---------|
| Free | €0 | 1 project, max 10.000 events, watermark op exports |
| Starter | €29/mnd | 5 projecten, max 100.000 events, PDF exports |
| Pro | €79/mnd | Onbeperkt, AI insights, team-toegang, API-koppeling |

### Conductus Add-on
| Tier | Prijs | Beschrijving |
|------|-------|-------------|
| Pro Add-on | +€15/mnd | Process mining module binnen Conductus portal |
| Business | Inbegrepen | Full analytics stack, AI insights |

---

## Technische visie

Retroductus bestaat uit twee lagen:

1. **Mining Engine** — PM4Py microservice (Python/FastAPI, Docker)
   - Verantwoordelijk voor alle computationele process mining
   - Exposed via REST API
   - Zelfstandig inzetbaar of als sidecar bij Conductus

2. **Retroductus UI** — Next.js applicatie
   - Gedeelde design language met Conductus (Tailwind, component library)
   - Standalone op retroductor.nl
   - Insluitbaar als iframe/module in Conductus portal

---

## Sucescriteria (12 maanden)

- [ ] 50 actieve standalone gebruikers op retroductor.nl
- [ ] 10 Conductus-klanten actief met process mining add-on
- [ ] < 5 seconden analysetime voor logs tot 50.000 events
- [ ] NPS > 40 bij gebruikers na eerste analyse
- [ ] Succesvolle integratie met Flowable event log export
