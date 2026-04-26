# ADR 0005 — Retentie-cleanup-strategie

- **Status:** geaccepteerd
- **Datum:** 2026-04-26
- **Cohort:** Retroductus — Fase 2 (intern testen)
- **Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 9
- **Migratie:** [`supabase/migrations/20260426000003_retention_cleanup_function.sql`](../../supabase/migrations/20260426000003_retention_cleanup_function.sql)

## Context

De DPA-pagina ([`src/app/dpa/page.tsx`](../../src/app/dpa/page.tsx) §3) belooft:

| Gegeven | Bewaartermijn |
| --- | --- |
| Event logs (XES/CSV) | Verwijderd na analyse, max. 30 dagen |
| Analyse-resultaten (geaggregeerd) | Zolang account actief |
| Accountgegevens (e-mail) | Zolang account actief |

Er is op dit moment geen aparte `event_logs`-tabel. Raw event-data en
analyse-resultaten leven beide in `public.mining_jobs`:

- `mining_jobs.result` (JSONB) — bevat gemengd: aggregaten (DFG, conformance) én potentieel raw events.
- `mining_jobs.filename` — naam van het geüploade XES/CSV-bestand.
- `mining_jobs.event_count` — telling.

Een ongedifferentieerde DELETE op `mining_jobs >30d` zou dus per ongeluk
levenslang-bedoelde analyse-resultaten weggooien. Tegelijk heeft Fase 2
"intern testen" geen externe klanten, dus dataverlies is hier nog
makkelijker te herstellen dan in productie — maar we willen het patroon
goed neerzetten vóór de eerste betalende klant.

## Beslissing

**Functie nu, cron later.**

- Migratie `20260426000003_retention_cleanup_function.sql` voegt
  `public.cleanup_old_event_logs()` toe als `SECURITY DEFINER` functie.
- Scope minimaal: alleen `mining_jobs.status = 'error'` ouder dan 30 dagen
  worden verwijderd. Mislukte runs hebben geen waarde voor de gebruiker en
  kunnen veilig weg.
- **Geen** `pg_cron`-schedule; functie wordt nu niet automatisch
  aangeroepen. Aanroepen kan handmatig via
  `SELECT * FROM public.cleanup_old_event_logs();` (alleen door
  `postgres`-superuser).

## Activatie-opties (te kiezen in Fase 2.5 of later)

| Optie | Voor | Tegen |
| --- | --- | --- |
| **A. Vercel Cron Job** | Eenvoudig, geen DB-extension nodig | Frontend draait nu op Beelink, niet meer Vercel — alleen relevant als fallback |
| **B. `pg_cron` in Supabase** | Native, zelfde stack, geen externe trigger | Vereist `pg_cron`-extension actief in Coolify-Supabase-stack (controleren) |
| **C. Cron op Beelink** | Geen DB-changes, eenvoudig te debuggen | Externe afhankelijkheid; netwerkroute via Supabase-REST of `docker exec` nodig |

**Voorkeur: B (`pg_cron`)** zodra de scope is uitgebreid. Reden: native bij
de DB, geen extra hop, duidelijke audit-trail in `cron.job_run_details`.

## Exit-criteria voor activatie

Cron pas inschakelen wanneer alle drie waar zijn:

1. **Scope uitgebreid** — audit van wat er feitelijk in `mining_jobs.result`
   staat. Onderscheid tussen "raw events" (te wissen na 30d, conform DPA) en
   "aggregaten" (levenslang). Mogelijk via een aparte JSONB-key
   `result.raw_events` of door raw events naar Supabase Storage te
   verplaatsen en alleen de bestandsverwijzing in `result` te houden.
2. **Eerste betalende klant** — dan wordt 30-dagen-belofte juridisch
   bindend en moet de cron daadwerkelijk draaien. Vóór die tijd is het een
   "best effort" en weegt dataverlies-risico zwaarder dan retentie-strikte
   naleving.
3. **Audit-log-tabel voor cleanup-runs** — `retention_cleanup_log` met
   `run_at`, `deleted_count`, `error` zodat falende cron-runs zichtbaar
   zijn (anders verdwijnt een 30-dagen-belofte in stilte als de extension
   stopt).

## Gevolgen

- **Compliance**: DPA-belofte wordt nu nog niet automatisch nageleefd voor
  raw event-data in `mining_jobs.result`. Dat is acceptabel zolang Fase 2
  alleen door interne testers wordt gebruikt en de DPA pas bij de eerste
  externe klant juridisch bindend wordt.
- **Veiligheid**: geen risico op onbedoelde DELETE van levensdata door deze
  migratie. Alleen `error`-rows worden geraakt.
- **Toekomstige werk**: Fase 2.5 of een eigen Ordo voor scope-uitbreiding
  + activatie. Bevat audit-log-tabel + scope-decompositie van
  `mining_jobs.result`.

## Open punten

- `pg_cron`-extensie nog niet geverifieerd in de Coolify-Supabase-stack op
  Beelink (`supabase-db-nfjxj1dahpu416ywxpdiqya1`). Bij activatie eerst
  `CREATE EXTENSION IF NOT EXISTS pg_cron;` testen.
- DPA-tekst noemt expliciet "Event logs (XES/CSV)" maar er is geen aparte
  tabel daarvoor. Bij Fase 2.5: óf een `event_logs`-tabel introduceren, óf
  de DPA-tekst herschrijven naar de werkelijke datastructuur.
