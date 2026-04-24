# Retroductus — interne testers Fase 2

**Datum:** 2026-04-24
**Fase:** Fase 2 — intern testen

## Omgeving

- **App:** <https://retroductor.nl> (Next.js 15 op Beelink/Coolify, Cloudflare Tunnel + Cloudflare Access e-mail-allowlist)
- **Engine:** <https://retroductus-engine.cyberductus.nl> (FastAPI + PM4Py op Beelink/Coolify, CF Access service-token voor frontend-aanroepen)
- **Supabase-stack:** <https://supabase-retroductus.cyberductus.nl> (self-host op Beelink — vervanger van de eerdere Cloud-instance `ttfgpbuievkuiwdhmtaz` die is verwijderd)
- **Toegang:** Cloudflare Access allowlist op `retroductor.nl` — alleen e-mails uit onderstaande lijst komen door de SSO-gate.

## Testers

Wachtwoorden staan **niet** in dit bestand. Pieter heeft ze onder `credentials.md` → sectie "retroductus interne testers (Fase 2)".

| E-mail                    | Rol                              | Aangemaakt |
| ------------------------- | -------------------------------- | ---------- |
| `pieter@debrabander.com`  | owner / Legatus (admin-vlag)     | 2026-04-24 |
| `tester1@retroductor.nl`  | gewone user (free-plan)          | 2026-04-24 |
| `tester2@retroductor.nl`  | gewone user (free-plan)          | 2026-04-24 |

Indien mail bezorging op `@retroductor.nl` faalt (geen catch-all ingesteld): vervang door
`pieter+test1@debrabander.com` en `pieter+test2@debrabander.com` zodat confirmation-mails
bij Pieter landen. `docs/agent-log/2026-04-24-ordo-4-tester-seeding.md` beschrijft welk
pad daadwerkelijk is gekozen.

## Test-scenario's Fase 2

Volg deze volgorde per tester. Bugs melden via `/app/settings/issues`.

1. **Registratie + DPA (nieuwe tester)**
   - Landingspagina `/` → knop "Registreren" → `/register`.
   - Vinkje DPA 2026-04-24 + sterk wachtwoord.
   - Verwacht: redirect naar `/app`; in Supabase-DB staat een rij in `dpa_acceptance`.

2. **Upload + DFG-visualisatie**
   - `/app` → "Upload event log" → kies een CSV of XES uit `testbestanden/`.
   - Verwacht: status "running" → "done" binnen 30s, DFG verschijnt op `/app/projects/[id]`.

3. **Conformance-check**
   - Op project-pagina: tab "Conformance" → "Check starten".
   - Verwacht: binnen 20s een kleurgecodeerde weergave van gemiste/extra activiteiten.

4. **AI-insight genereren**
   - Tab "Inzichten" → "Genereer insight".
   - Vereist geldige `ANTHROPIC_API_KEY` in engine-env. Bij ontbrekende key: scenario overslaan en melden.
   - Verwacht: stream in Nederlands, geen 500.

5. **Issue-rapport indienen**
   - `/app/settings/issues` → "Nieuw issue" → categorie "bug".
   - Verwacht: issue verschijnt in de lijst voor de admin (Pieter).

6. **Logout + login opnieuw**
   - Uitloggen → `/login` → inloggen met zelfde credentials.
   - Verwacht: zelfde project staat nog in de lijst (RLS-isolatie tussen tester1/tester2 controleren).

## Wat te rapporteren

- **Bugs:** via `/app/settings/issues` in de app (ingebouwd). Categorie `bug` + korte beschrijving + URL van de pagina.
- **Pijnpunten / UX-feedback:** idem, categorie `suggestie`.
- **Toegang/inlog-problemen:** handmatig naar Pieter (`pieter@debrabander.com`) — de issue-form vereist ingelogde sessie, dus bij login-bugs faalt die route.

## Wat NIET doen

- Geen productie-event-logs van klanten uploaden — Fase 2 is **intern**, DPA is zelf-geaccepteerd.
- Geen Stripe-testbetalingen proberen — prep-only scaffold, alle `/api/stripe/*` endpoints geven 501.
- Geen data delen buiten het testteam.
