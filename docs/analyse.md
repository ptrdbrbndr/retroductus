# Toolselectie-analyse: Open-source Process Mining

**Project:** Retroductus
**Datum:** 2026-03-13
**Auteur:** Pieter de Brabander
**Doel:** Selectie van de beste open-source process mining tool voor integratie in Conductus en als zelfstandig product (retroductor.nl)

---

## Context

Conductus is een CMMN SaaS-platform gebouwd op Next.js, Supabase en Flowable 8.0. Het platform beheert case-gerelateerde processen. Een logische uitbreiding is **process mining**: het terugkijken op uitgevoerde processen om knelpunten, bottlenecks en afwijkingen te visualiseren op basis van echte data uit Flowable/Supabase.

Het eindproduct moet op twee manieren beschikbaar zijn:
1. **Geïntegreerd** — als module binnen conductus.nl (voor bestaande klanten)
2. **Zelfstandig** — als eigen webapplicatie op retroductor.nl, los van Conductus inzetbaar voor organisaties met eigen eventlog-data

---

## Beoordeelde tools

### 1. PM4Py (Process Mining for Python)

| Eigenschap | Beoordeling |
|-----------|------------|
| Licentie | AGPL 3.0 |
| Tech stack | Python, REST API via PM4Py-WS, Docker |
| Self-hosting | Uitstekend — volledig containeriseerbaar |
| Web UI | Beperkt ingebouwd — REST API + custom frontend vereist |
| Embeddability | Uitstekend — ontworpen als library en via API |
| Onderhoud | Actief — v2.7.18 (mei 2025), >1M downloads |
| BPMN support | Ja |
| CMMN support | Nee (indirecte ondersteuning via event logs) |
| XES support | Ja |

**Sterke punten:**
- Meest actief onderhouden open-source process mining library (2025)
- Uitstekende Docker-ondersteuning via PM4Py-WS
- REST API ideaal voor integratie met Next.js frontend
- Object-centric process mining (OCPM) — geschikt voor CMMN case-data
- LLM-integratie beschikbaar (past bij Claude API in Conductus)
- Beschikbaar als FastAPI microservice

**Zwakke punten:**
- Geen kant-en-klare web UI
- AGPL 3.0 licentie vereist aandacht bij commercieel gebruik
- Geen native CMMN-support (maar event logs uit Flowable zijn inzetbaar)

---

### 2. Apromore Community Edition

| Eigenschap | Beoordeling |
|-----------|------------|
| Licentie | Open-source (Community Edition) |
| Tech stack | Java/Spring, MySQL, Docker |
| Self-hosting | Goed — Docker-compose |
| Web UI | Volledig — portal, editor, visualisaties |
| Embeddability | Beperkt — meer standalone dan embedded |
| Onderhoud | **GEARCHIVEERD** — sep. 2025, overgenomen door Salesforce |
| BPMN support | Ja |
| CMMN support | Nee |
| XES support | Ja |

**Conclusie:** Afgevallen. Repository is gearchiveerd (september 2025) en Apromore is overgenomen door Salesforce (november 2025). Geen basis voor nieuw product.

---

### 3. ProM 6

| Eigenschap | Beoordeling |
|-----------|------------|
| Licentie | GPL v2 |
| Tech stack | Java, Swing desktop applicatie |
| Self-hosting | Alleen als desktopapplicatie |
| Web UI | Geen |
| Embeddability | Zeer beperkt |
| Onderhoud | Actief — v6.15 |

**Conclusie:** Afgevallen. Desktop-only, niet geschikt voor een web SaaS-product.

---

### 4. bupaR

| Eigenschap | Beoordeling |
|-----------|------------|
| Licentie | Open-source (CRAN) |
| Tech stack | R, optioneel R Shiny voor web |
| Self-hosting | Ja |
| Web UI | Via Shiny (beperkt) |
| Embeddability | Alleen R-ecosysteem |
| Onderhoud | Actief — juli 2025 |

**Conclusie:** Afgevallen. R-ecosysteem past niet bij de bestaande Next.js/Python stack. Te niche voor productie SaaS.

---

### 5. Apache Flink

| Eigenschap | Beoordeling |
|-----------|------------|
| Licentie | Apache 2.0 |
| Tech stack | Java/Scala, gedistribueerd |
| Self-hosting | Ja |
| Web UI | Ja (monitoring) |
| Embeddability | Ja — maar geen process mining |
| Onderhoud | Actief |

**Conclusie:** Afgevallen. Flink is een stream-processing engine, geen process mining tool. Kan eventueel als event-ingestie layer dienen, maar niet als core.

---

## Winnaar: PM4Py

**PM4Py** is de duidelijke winnaar op basis van:

1. **Activiteit** — meest actief onderhouden open-source process mining library in 2025
2. **API-first** — REST API via PM4Py-WS maakt integratie met Next.js eenvoudig
3. **Docker-native** — sluit aan op bestaande Railway/Vercel architectuur van Conductus
4. **Object-centric mining** — geschikt voor de case-georiënteerde data in Flowable/Supabase
5. **AI-ready** — LLM-integratie past bij de Anthropic Claude API die al in Conductus zit
6. **Dubbel inzetbaar** — als embedded microservice én als zelfstandig product

### Licentie-overweging

AGPL 3.0 vereist dat aanpassingen aan PM4Py zelf open-source blijven. De **wrapper/frontend/API** die we bouwen kan echter proprietary zijn, mits we PM4Py als afzonderlijke service draaien (microservice-patroon). Dit is de aanbevolen aanpak.

---

## Conclusie

| Criterium | PM4Py | Apromore | ProM | bupaR |
|-----------|-------|----------|------|-------|
| Actief onderhoud | ✓ | ✗ | ✓ | ✓ |
| Web-deployable | ✓ | ✓ | ✗ | Beperkt |
| Integreerbaar in Next.js | ✓ | Beperkt | ✗ | ✗ |
| Docker-native | ✓ | ✓ | ✗ | ✗ |
| AI-uitbreidbaar | ✓ | ✗ | ✗ | ✗ |
| Commercieel bruikbaar | ✓* | ✗ | ✓* | ✓* |

*Mits microservice-patroon gehanteerd wordt voor AGPL/GPL-tools

**Aanbeveling: PM4Py als core engine, gehost als Python/FastAPI microservice, met een eigen Next.js frontend (Retroductus UI).**
