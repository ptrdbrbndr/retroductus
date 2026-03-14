# Testdata — Retroductus Process Mining

Voorbeeldlogbestanden om de mining engine te testen. Alle bestanden bevatten realistische procesvarianten inclusief afwijkingen (rework, escalaties, afwijzingen).

## Bestanden

### CSV-formaat

| Bestand | Proces | Cases | Activiteiten | Bijzonderheden |
|---------|--------|-------|--------------|----------------|
| `factuurverwerking.csv` | Accounts payable — factuurverwerking | 10 | 7 unieke activiteiten | Duplicaten, herziening, leverancier-contact |
| `klachtenbehandeling.csv` | Klantenservice — klachtenafhandeling | 6 | 10 unieke activiteiten | Escalaties, compensaties, niet-bereikbare klanten |
| `leningaanvraag.csv` | Financieel — kredietaanvragen | 6 | 12 unieke activiteiten | Afwijzingen, aanvullende documenten, lange doorlooptijden |

### XES-formaat (industrie-standaard)

| Bestand | Proces | Traces | Bijzonderheden |
|---------|--------|--------|----------------|
| `inkoopproces.xes` | Inkoop-to-pay (P2P) | 5 | Meerdere offertes, 3-weg match fouten, directiegoedkeuring bij grote bedragen |

## Kolomstructuur CSV

```
case_id      — unieke case/procesinstantie (bijv. INV-001, KL-2024-001)
activity     — naam van de uitgevoerde activiteit
timestamp    — tijdstip van voltooiing (YYYY-MM-DD HH:MM:SS)
resource     — medewerker of systeem dat de activiteit uitvoerde
duration_ms  — duur in milliseconden
```

## XES-attributen

```
concept:name (trace)   — case ID
concept:name (event)   — activiteitnaam
time:timestamp         — tijdstip (ISO 8601 met tijdzone)
org:resource           — uitvoerder
lifecycle:transition   — altijd "complete" in deze bestanden
```

## Verwachte analyseresultaten

### factuurverwerking.csv
- **Happy path** (7 stappen): Factuur ontvangen → registreren → controleren → goedkeuring aanvragen → goedkeuring verleend → betaling aanmaken → betaling verstuurd
- **Varianten**: duplicaat (INV-002), herziening na weigering (INV-003, INV-006), leverancier contact (INV-010)
- **Bottleneck**: doorlooptijd goedkeuring (soms >1 dag)

### klachtenbehandeling.csv
- **Happy path**: ontvangen → registreren → categoriseren → toewijzen → onderzoek → oplossing voorstellen → akkoord → opgelost → gesloten
- **Varianten**: escalatie naar manager (KL-2024-002, KL-2024-004), klant niet bereikbaar (KL-2024-004)
- **Bottleneck**: onderzoeksfase en wachttijd klant

### leningaanvraag.csv
- **Happy path**: aanvraag → identiteitscheck → kredietbeoordeling → documenten → verificatie → risicobeoordeling → goedkeuring → contract → uitbetaling
- **Varianten**: directe afwijzing (LOAN-0002), aanvullende info nodig (LOAN-0003), late documentaanlevering (LOAN-0005)
- **Bottleneck**: wachttijd op documenten van aanvrager

### inkoopproces.xes
- **Happy path**: verzoek → goedkeuring → (offerte) → PO aanmaken → PO versturen → goederen ontvangen → factuur → 3-weg match → betaling goedgekeurd → betaling uitgevoerd
- **Varianten**: meerdere offertes (PO-2024-003), match-fout met creditnota (PO-2024-003), directiegoedkeuring bij >€10k (PO-2024-005)
- **Bottleneck**: tijd tussen PO en levering, 3-weg match fouten
