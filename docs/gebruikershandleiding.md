# Gebruikershandleiding: Retroductus

**Versie:** 0.1
**Datum:** 2026-03-14
**Geldt voor:** Retroductus als module binnen Conductus (v0.1)

---

## Inleiding

Retroductus is de process mining module van de Conductus-suite. Met Retroductus analyseer je hoe jouw processen **werkelijk** verlopen op basis van event-data uit Conductus of uit een extern systeem.

Je krijgt direct antwoord op vragen als:
- Welke processtappen duren het langst?
- Welke routes worden het vaakst doorlopen?
- Waar wijkt het werkelijke proces af van het bedoelde?
- Wat moet ik aanpassen om sneller resultaat te boeken?

---

## Vereisten

| Vereiste | Toelichting |
|----------|-------------|
| Conductus-account | Met een actieve tenant |
| Process Mining feature | Moet zijn ingeschakeld door een owner (zie Activering) |
| Bestaande event-data | Flowable-koppeling of een CSV/XES-bestand |

---

## Activering (voor owners)

De process mining module is standaard uitgeschakeld. Een **owner** van de tenant kan dit activeren:

1. Ga naar **Instellingen** → **Admin**
2. Zoek het blok **Process Mining**
3. Klik op de toggle om de module in te schakelen
4. De navigatie toont nu het menu-item **Process Mining**

> Heb je de admin-pagina niet? Dan ben je geen owner van de tenant. Vraag de owner om de module te activeren.

---

## Navigatie

Na activering verschijnt **Process Mining** in het linkermenu van Conductus:

```
Dashboard
Cases
Processen
Process Mining    ← nieuw
Instellingen
```

Klik hierop om naar het mining-dashboard te gaan.

---

## Een analyse starten

### Stap 1: Nieuwe analyse aanmaken

1. Klik op **+ Nieuwe analyse** in het mining-dashboard
2. Kies het type analyse:

   | Type | Wat het doet |
   |------|-------------|
   | **Process Discovery** | Ontdekt het werkelijke procesmodel uit event-data |
   | **Performance Analytics** | Berekent doorlooptijden, wachttijden en bottlenecks |
   | **Conformance Checking** | Vergelijkt werkelijk proces met normatief model |

### Stap 2: Data koppelen

**Optie A — Flowable-koppeling (automatisch)**
- Selecteer een Flowable process definition
- Retroductus haalt de event-data automatisch op uit `ACT_HI_ACTINST`

**Optie B — CSV upload**
Vereist formaat:

| Kolom | Verplicht | Omschrijving |
|-------|-----------|-------------|
| `case_id` | Ja | Unieke identifier per case/dossier |
| `activity` | Ja | Naam van de processtap |
| `timestamp` | Ja | Tijdstip in ISO 8601 (bv. `2026-03-01T09:00:00Z`) |
| `resource` | Nee | Wie de stap uitvoerde |

Voorbeeld:
```csv
case_id,activity,timestamp,resource
CASE-001,Ontvangst,2026-03-01T09:00:00Z,jan@org.nl
CASE-001,Beoordeling,2026-03-01T14:00:00Z,pieter@org.nl
CASE-001,Goedkeuring,2026-03-02T10:00:00Z,pieter@org.nl
CASE-002,Ontvangst,2026-03-01T10:00:00Z,jan@org.nl
```

**Optie C — XES upload**
- Standaard process mining formaat (IEEE 1849-2016)
- Wordt automatisch herkend en ingeladen

### Stap 3: Wachten op resultaat

Analyses worden asynchroon uitgevoerd. Afhankelijk van de loggrootte:

| Events | Verwachte tijd |
|--------|---------------|
| < 10.000 | < 10 seconden |
| 10.000 – 100.000 | 10 – 60 seconden |
| > 100.000 | 1 – 5 minuten |

Je ziet de status in het dashboard:
- **In wachtrij** — de job staat klaar
- **Verwerkt** — de analyse loopt
- **Gereed** — resultaten beschikbaar
- **Fout** — zie foutmelding voor details

---

## Resultaten bekijken

### Tab: Process Discovery

Toont het **Direct-Follows Graph (DFG)** — een visuele weergave van alle doorlopen paden:

- **Knopen** = processtappen (activiteiten)
- **Pijlen** = overgangen, dikte = frequentie
- **Labels** = aantal keer dat pad is doorlopen

Gebruik dit om te zien welke paden dominant zijn en welke zeldzaam.

### Tab: Performance Analytics

Toont timing-informatie per processtap:

- **Gemiddelde doorlooptijd** per activiteit
- **Wachttijden** tussen stappen
- **Heatmap** — rood = langzaam, groen = snel
- **Resource-verdeling** — wie doet wat, hoe lang

### Tab: AI Insights

Claude genereert op basis van de analyseresultaten:

- **Samenvatting** — wat valt het meest op?
- **Top 3 bottlenecks** — met uitleg en context
- **Concrete aanbevelingen** — wat kun je direct aanpakken?
- **Prioritering** — impact vs. implementatiemoeite

> AI Insights zijn beschikbaar op het **Pro** tier en bij de **Conductus Pro** add-on.

---

## Veelgestelde vragen

**Mijn analyse blijft op "In wachtrij" staan**
Controleer of de Mining Engine actief is. Neem contact op met de beheerder als dit langer dan 5 minuten duurt.

**Ik zie geen Process Mining in het menu**
De feature is niet ingeschakeld voor jouw tenant. Vraag de owner dit te activeren via Instellingen → Admin.

**Mijn CSV wordt niet herkend**
Controleer of de kolommen `case_id`, `activity` en `timestamp` aanwezig zijn. Het timestamp-formaat moet ISO 8601 zijn.

**De AI Insights zijn in het Engels**
Dit is een bekende beperking in v0.1. Nederlandstalige insights staan op de roadmap.

**Hoe lang worden analyseresultaten bewaard?**
Resultaten worden 90 dagen bewaard. Na die tijd worden ze automatisch verwijderd.

---

## Gegevensbeveiliging

- Alle event-data wordt versleuteld opgeslagen (at-rest)
- Data wordt verwerkt in EU-datacenters (Frankfurt)
- Tenant-isolatie via Supabase Row Level Security
- Event-data wordt nooit gedeeld met derden, ook niet voor AI-training
- De Claude API verwerkt alleen geanonimiseerde samenvattingen (geen ruwe event-data)

---

## Ondersteuning

Voor vragen of problemen:
- **E-mail:** support@conductus.nl
- **Issues:** via de Conductus-portal → Instellingen → Ondersteuning
