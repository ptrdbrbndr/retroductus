# Businessplan — Retroductus

## Samenvatting

Retroductus is een process mining SaaS-platform dat organisaties inzicht geeft in hoe hun processen werkelijk verlopen — op basis van feitelijke event log-data. Het platform combineert een Python/PM4Py mining engine met een Next.js gebruikersinterface en integreert native met Conductus (CMMN), maar is ook zelfstandig inzetbaar voor organisaties die werken met Flowable, Camunda, SAP of handmatig geëxporteerde event logs.

Retroductus richt zich op twee marktsegmenten: Conductus-klanten die analytics willen bovenop hun bestaande procesdata (add-on model), en standalone organisaties die process mining zoeken zonder de hoge kosten van enterprise tools als Celonis of Signavio (SaaS-abonnement op retroductor.nl).

---

## Marktanalyse

### Doelgroep

**Segment 1 — Conductus-klanten (primair, korte termijn)**
Organisaties die Conductus gebruiken voor CMMN-procesbeheer en behoefte hebben aan inzicht in procesuitvoering. Deze klanten hebben al vertrouwen in het ductus-ecosysteem en een directe datastroom naar Retroductus (via Flowable `ACT_HI_*` schema). Besliscyclus: 4–8 weken. Gemiddelde contractwaarde: €15/mnd per organisatie als add-on.

**Segment 2 — Standalone procesgeoriënteerde organisaties (secundair, middellange termijn)**
Middelgrote organisaties (50–500 medewerkers) in logistiek, zorg, overheid en financiën die process mining willen toepassen maar geen budget hebben voor enterprise tools (Celonis: €100.000+/jaar). Ze exporteren event logs uit bestaande systemen als CSV of XES. Besliscyclus: 6–12 weken. Gemiddelde contractwaarde: €29–€79/mnd.

### Marktomvang

- **TAM**: Wereldwijde process mining markt: ~€3,3 miljard (2025), groei 40%+ CAGR
- **SAM**: Nederlandse organisaties met procesbeheersystemen en behoefte aan analytics: ~2.000 bedrijven
- **SOM (jaar 1–2)**: 50 standalone gebruikers + 10 Conductus-klanten met add-on

### Concurrentieanalyse

| Concurrent | Prijs | Zwaktes | Kans voor Retroductus |
|---|---|---|---|
| Celonis | €100.000+/jaar | Alleen enterprise, complex, duur | Betaalbaar alternatief voor MKB |
| Signavio (SAP) | €50.000+/jaar | SAP-afhankelijk, geen CMMN-support | Onafhankelijk, CMMN-native |
| ProM | Gratis (desktop) | Desktop-only, niet schaalbaar, technisch | Web-based, gebruiksvriendelijk |
| Apromore | Open source (verouderd) | Niet actief onderhouden | Actief platform, AI-inzichten |
| Budibase/Tableau | Variabel | Geen echte process mining | Domeinspecialisatie |

**Unieke positie van Retroductus**: De enige betaalbare, web-based process mining tool met native CMMN-integratie via Conductus én AI-inzichten via Claude.

---

## Businessmodel

### Inkomstenmodel

**Retroductus Standalone (retroductor.nl)**

| Tier | Prijs | Limieten |
|---|---|---|
| Free | €0 | 1 project, max 10.000 events, watermark op exports |
| Starter | €29/mnd | 5 projecten, max 100.000 events, PDF exports |
| Pro | €79/mnd | Onbeperkt, AI insights (Claude), team-toegang, API |

**Conductus Add-on**

| Tier | Prijs | Beschrijving |
|---|---|---|
| Pro Add-on | +€15/mnd | Process mining module in Conductus-portaal |
| Business | Inbegrepen | Full analytics stack + AI insights |

### Kostenstructuur

| Post | Maandelijks | Eenmalig |
|---|---|---|
| Railway (Mining Engine hosting) | €15–€50 | — |
| Supabase (database + storage) | €25 | — |
| Vercel (UI hosting) | €0–€20 | — |
| Anthropic API (AI insights) | ~€0,05 per analyse | — |
| Ontwikkeling MVP (Fase 0–1) | — | ~150 uur |

**Totale operationele kosten bij 50 klanten**: ~€100–€150/mnd.

### Break-even

Bij €29/mnd gemiddeld over 50 klanten: **€1.450/mnd omzet**.
Operationele kosten: ~€150/mnd.
Break-even bij **~6 betalende klanten** (Starter-tier).

---

## Go-to-market strategie

### Fase 1: Conductus-integratie als springplank (Q2 2026)
- Retroductus als beta-feature aanbieden aan bestaande Conductus-klanten
- Directe datastroom via Flowable-connector — geen handmatige export nodig
- Free trial van 30 dagen voor alle Conductus Pro/Business klanten

### Fase 2: Standalone lancering (Q3 2026)
- retroductor.nl live met Free en Starter tier
- SEO-content: "process mining zonder Celonis", "gratis process mining tool"
- Vergelijkingspagina's vs. Celonis, ProM, Signavio

### Fase 3: Community en thought leadership (Q4 2026 – Q1 2027)
- Publicaties in BPM-community: "Process mining voor CMMN-processen"
- Integraties met Flowable en Camunda exportformaten
- Partnership met Conductus voor gezamenlijke klantreferenties

### Kanalen
- Direct: retroductor.nl (SEO, content marketing)
- Indirect: Conductus add-on (cross-sell via bestaand klantenbestand)
- Community: TestNet, BPM-conferenties, LinkedIn

---

## Financiële prognose (3 jaar)

| | Jaar 1 (2026) | Jaar 2 (2027) | Jaar 3 (2028) |
|---|---|---|---|
| Standalone betalende klanten | 15 | 60 | 150 |
| Conductus add-on klanten | 5 | 20 | 50 |
| Gem. MRR per klant | €35 | €45 | €55 |
| **Maandelijkse omzet (MRR)** | €700 | €3.600 | €11.000 |
| **Jaaromzet** | ~€6.000 | ~€40.000 | ~€120.000 |
| Operationele kosten | ~€2.400 | ~€6.000 | ~€15.000 |
| **Resultaat** | ~€3.600 | ~€34.000 | ~€105.000 |

*Aannames: groei gedreven door Conductus cross-sell in jaar 1, organisch en content-marketing in jaar 2–3.*

---

## Risico's & mitigaties

| Risico | Kans | Impact | Mitigatie |
|---|---|---|---|
| PM4Py AGPL-licentieconflict bij SaaS | Laag | Hoog | Microservice-patroon: PM4Py draait geïsoleerd; alleen resultaten worden doorgegeven; juridisch onderbouwd |
| Lange analysetijden bij grote logs | Medium | Medium | Asynchrone jobs met statuspolling; tijdslimieten per tier; caching van resultaten |
| Lage adoptie zonder Conductus-klanten | Medium | Medium | Free tier als groeimotor; SEO-content; vergelijkingspagina's; geen hoge acquisitiekosten nodig |
| Flowable schema-wijzigingen | Laag | Medium | Abstractielaag in connector; getest tegen vaste Flowable-versie; connector documentatie bijhouden |
| Pricing-druk van gratis alternatieven (ProM) | Laag | Laag | Differentiatie op gebruiksvriendelijkheid, web-based, AI-inzichten — ProM is voor experts |
| Railway/infra-kosten bij schaal | Medium | Laag | Tier-limieten per abonnement; auto-scaling met kostenplafond; migratiepad naar Supabase Edge Functions |
| Single developer bottleneck | Hoog | Medium | Fasering: MVP af voor Conductus, daarna uitbreiden; technische schulden minimaliseren via vibe-tests |

---

*Versie 1.0 — 2026-03-15*
