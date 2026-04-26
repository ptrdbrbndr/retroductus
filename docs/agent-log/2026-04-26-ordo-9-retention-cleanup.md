# Ordo 9 — Retentie-cleanup-functie

- **Datum:** 2026-04-26
- **Cohort:** Retroductus — Fase 2 (intern testen)
- **Owner:** Centurio Janus
- **Plan-referentie:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) — Ordo 9
- **Commit:** `42889b9` op `staging`
- **ADR:** [`docs/adr/0005-retentie-cleanup-strategie.md`](../adr/0005-retentie-cleanup-strategie.md)

## Resultaat

Cleanup-functie `public.cleanup_old_event_logs()` is ingericht in repo én
toegepast op de live Supabase (Beelink, container
`supabase-db-nfjxj1dahpu416ywxpdiqya1`). **Niet** geactiveerd in `pg_cron` —
conform briefing en ADR 0005.

## Scope-redenering

DPA ([`src/app/dpa/page.tsx`](../../src/app/dpa/page.tsx) §3) belooft 30
dagen voor "Event logs (XES/CSV)" en levenslang voor analyse-resultaten.
Er is **geen** aparte `event_logs`-tabel; raw events en aggregaten leven
beide in `public.mining_jobs.result` (JSONB). Een ongedifferentieerde
DELETE op `mining_jobs >30d` zou levenslang-bedoelde aggregaten weggooien.

**Conservatieve scope gekozen** (zoals briefing voorstelde): alleen
`mining_jobs.status = 'error'` ouder dan 30 dagen. Dat zijn mislukte runs
zonder analyse-waarde, veilig te wissen. Scope-uitbreiding (raw events
scheiden van aggregaten in `result`) staat in ADR 0005 als open punt voor
Fase 2.5.

## Migratie-toepassing-bewijs

```
$ docker exec -i supabase-db-nfjxj1dahpu416ywxpdiqya1 \
    psql -U supabase_admin -d postgres -f /tmp/retroductus_ordo9.sql
CREATE FUNCTION
REVOKE
GRANT
COMMENT

$ docker exec -i supabase-db-nfjxj1dahpu416ywxpdiqya1 \
    psql -U supabase_admin -d postgres -c '\df cleanup_old_event_logs'
                                      List of functions
 Schema |          Name          |       Result data type       | Argument data types | Type
--------+------------------------+------------------------------+---------------------+------
 public | cleanup_old_event_logs | TABLE(deleted_count integer) |                     | func
(1 row)

$ docker exec -i supabase-db-nfjxj1dahpu416ywxpdiqya1 \
    psql -U supabase_admin -d postgres -c 'SELECT * FROM public.cleanup_old_event_logs();'
 deleted_count
---------------
             0
(1 row)
```

Functie bestaat, executable door `postgres`-superuser, en draait dry —
0 rows verwijderd (geen oude error-rows op live staging-DB).

## Open punten (voor activatie in Fase 2.5)

1. **Scope-uitbreiding**: audit van `mining_jobs.result`-JSONB. Onderscheid
   maken tussen raw events (te wissen) en aggregaten (levenslang). Mogelijk
   via `result.raw_events`-key of door raw bestanden naar Supabase Storage
   te verplaatsen.
2. **`pg_cron`-extensie**: nog niet geverifieerd in de Coolify-Supabase-stack
   op Beelink. Bij activatie eerst `CREATE EXTENSION IF NOT EXISTS pg_cron;`
   testen.
3. **Audit-log-tabel** (`retention_cleanup_log`): nodig vóór activatie om
   stille cron-failures te detecteren.
4. **DPA-tekst herzien**: noemt expliciet "Event logs (XES/CSV)" maar er is
   geen aparte tabel. Bij Fase 2.5: óf tabel introduceren, óf DPA-tekst
   herschrijven.
5. **Eerste betalende klant**: trigger-moment voor activatie — pas dan is
   30-dagen-belofte juridisch bindend.

## Guardrails-controle

- `staging`-branch: ja (`git branch --show-current` → `staging`).
- `src/app/page.tsx` niet aangeraakt: bevestigd (`git show staging:src/app/page.tsx | head` toont volledige app, geen coming-soon).
- Geen `pg_cron` activatie: bevestigd (alleen `CREATE FUNCTION`).
- Geen ongebonden DELETE: bevestigd (`WHERE status='error' AND created_at < NOW() - INTERVAL '30 days'`).
- Geen secrets in commit/files: bevestigd.
- Geen Coolify-redeploy nodig: bevestigd (alleen DB + docs).
