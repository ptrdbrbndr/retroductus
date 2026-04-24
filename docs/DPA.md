# Verwerkersovereenkomst (DPA) — Retroductus
**Versie:** 1.0
**Ingangsdatum:** 2026-03-16
**Beheerder:** Ductus (Pieter de Brabander, pieter@debrabander.com)

---

## 1. Partijen

**Verwerkingsverantwoordelijke:** De klant (organisatie of persoon) die event logs uploadt naar Retroductus.

**Verwerker:** Ductus, gevestigd te Nederland, bereikbaar via pieter@debrabander.com.

---

## 2. Onderwerp en duur

Deze overeenkomst regelt de verwerking van persoonsgegevens en bedrijfsvertrouwelijke procesdata die de verwerkingsverantwoordelijke uploadt naar het Retroductus platform (retroductor.nl) voor process mining-analyses. De overeenkomst loopt zolang de klant gebruikmaakt van Retroductus.

---

## 3. Aard en doel van de verwerking

| Gegeven | Doel | Bewaartermijn |
|---------|------|---------------|
| Event logs (XES/CSV) | Process mining-analyse | Verwijderd na analyse, max. 30 dagen |
| Analyse-resultaten (geaggregeerd) | Rapportage aan klant | Zolang account actief |
| Accountgegevens (e-mail) | Authenticatie en communicatie | Zolang account actief |

Event logs worden **niet** gebruikt voor trainingsdoeleinden en **niet** gedeeld met derden buiten de subverwerkers in artikel 5.

---

## 4. Verplichtingen verwerker

De verwerker (Ductus) zal:

- Persoonsgegevens uitsluitend verwerken op basis van gedocumenteerde instructies van de verwerkingsverantwoordelijke.
- Technische en organisatorische maatregelen treffen conform artikel 32 AVG:
  - Versleuteling van data in transit (TLS 1.3)
  - Versleuteling van data at rest (Supabase AES-256)
  - Toegangsbeperking via Row Level Security en JWT-authenticatie
- De verwerkingsverantwoordelijke onmiddellijk informeren bij een datalek (binnen 72 uur na ontdekking).
- Gegevens verwijderen of teruggeven na beëindiging van de dienst, op verzoek van de verwerkingsverantwoordelijke.
- Geen subverwerkers inschakelen zonder voorafgaande schriftelijke toestemming (zie artikel 5).

---

## 5. Subverwerkers

| Subverwerker | Land | Dienst | Overeenkomst |
|---|---|---|---|
| Supabase Inc. | VS (EU-regio) | Database en authenticatie | DPA via Supabase |
| Vercel Inc. | VS (EU-regio) | Frontend hosting | DPA via Vercel |
| Railway Corp. | VS | Engine hosting (Python/FastAPI) | DPA via Railway |
| Anthropic PBC | VS | AI-analyse (Pro plan) | DPA via Anthropic |

---

## 6. Rechten van betrokkenen

De verwerker ondersteunt de verwerkingsverantwoordelijke bij het nakomen van verzoeken van betrokkenen (inzage, rectificatie, verwijdering). Gebruikers kunnen hun account en alle bijbehorende data verwijderen via de accountinstellingen.

---

## 7. Aansprakelijkheid

De verwerker is aansprakelijk voor schade die het gevolg is van een verwerking die niet voldoet aan de verplichtingen uit deze overeenkomst, tenzij de verwerker bewijst dat hij niet verantwoordelijk is voor de omstandigheid die de schade heeft veroorzaakt.

---

## 8. Toepasselijk recht

Deze overeenkomst is onderworpen aan Nederlands recht. Geschillen worden voorgelegd aan de bevoegde rechter te Nederland.

---

*Door het aanvinken van "Ik accepteer de Verwerkersovereenkomst" tijdens registratie gaat de klant akkoord met deze DPA.*
