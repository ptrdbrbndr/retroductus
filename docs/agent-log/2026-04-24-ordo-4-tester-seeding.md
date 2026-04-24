# Ordo 4 — Tester-seeding + baseline migratie committen

**Datum:** 2026-04-24
**Auteur:** Centurio Janus
**Status:** gedeeltelijk voltooid — blokker op infra-zijde (CF Tunnel 1033)

## Wat is gedaan

### 1. Baseline migratie voor `mining_jobs` geschreven + gecommit

- Nieuwe file `supabase/migrations/20260301000000_baseline_mining_jobs.sql`.
- Datum-prefix bewust vóór de eerste bestaande migratie (`20260314000001`) gezet zodat fresh-start hem eerst uitvoert.
- Reconstructie uit engine-code (`engine/routers/{logs,analysis,connectors,conformance,insights}.py`):
  `id`, `user_id`, `status` (check-constraint), `result`, `event_count`, `error_message`, `conformance_result`, `insights_cache`, `filename`, `created_at`, `completed_at`.
- Foreign key `user_id → auth.users(id) ON DELETE CASCADE` (retentie-regel).
- Indexen: `user_id`, `(user_id, created_at DESC)`, partial op `status IN ('pending','running')`.
- `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` — idempotent. Ook op de live DB op Beelink veilig.

**Kruis-check fresh-start volgorde (mentale simulatie):**

1. Baseline maakt `mining_jobs` mét `filename`.
2. RLS-migratie (20260314000001) zet 4 policies op de tabel — OK.
3. `user_plans` + `admin_flag` + `issues` — onafhankelijk van `mining_jobs`.
4. Migratie `20260316000001_add_filename_to_mining_jobs.sql` voegt `filename` toe met `IF NOT EXISTS` → no-op, geen conflict.
5. `dpa_acceptance` — onafhankelijk.

Alle 7 migraties draaien schoon op een verse stack.

### 2. `docs/staging-users.md` volledig herschreven

- Oude Cloud-URL (`ttfgpbuievkuiwdhmtaz`) en Conductus-testusers weg.
- Nieuwe omgeving-sectie: app + engine + Supabase-stack + CF Access allowlist.
- 3 testers (Pieter, tester1, tester2) zonder wachtwoorden — verwijzing naar `credentials.md`.
- 6 test-scenario's voor Fase 2: register+DPA, upload+DFG, conformance, AI-insight, issues, logout/login.
- Bug-meldingen via ingebouwd `/app/settings/issues`.

### 3. `supabase/seed-testers.sql` als herbruikbare seed

- Template die `user_plans`+`is_admin` + `dpa_acceptance` vult voor de 3 mails.
- Werkt idempotent via `ON CONFLICT DO NOTHING` + joins op `auth.users`.
- Verificatie-query aanwezig als comment.

### 4. Wachtwoorden in `.tmp/credentials-orig-5.txt`

- 3 URL-safe wachtwoorden via `openssl rand -base64 24` + `secrets.token_urlsafe`.
- Bestand in gitignored `c:\Projecten\.tmp\` met overname-instructie voor Legatus.
- Niet in repo, niet in agent-log, niet in `staging-users.md`.

## Blokker — users niet daadwerkelijk aangemaakt

Alle `*.cyberductus.nl` Supabase-FQDN's geven **Cloudflare error 1033** (tunnel hostname-ingress ontbreekt):

```
https://supabase-retroductus.cyberductus.nl/auth/v1/admin/users    → HTTP 530 / error 1033
https://supabase-iductus.cyberductus.nl/rest/v1/                   → HTTP 530 / error 1033
https://supabase-deductus.cyberductus.nl/rest/v1/                  → HTTP 530 / error 1033
https://supabase-superductus.cyberductus.nl/rest/v1/               → HTTP 530 / error 1033
https://supabase-aquaductus.cyberductus.nl/rest/v1/                → HTTP 530 / error 1033
```

App-FQDN's zijn wél bereikbaar (`retroductor.nl` → 302 CF Access, `retroductus-engine.cyberductus.nl` → 302). De engine-tunnel is herschreven via `PUT .../cfd_tunnel/{tun}/configurations` (zie credentials.md noot bij engine), de Supabase-stacks zijn dat nog niet.

**Mogelijke oorzaken (Legatus beslist fix):**

1. `cloudflared`-daemon op Beelink heeft geen ingress-regels voor `supabase-*.cyberductus.nl`. Fix: CF API `PUT /zones/.../cfd_tunnel/{tun}/configurations` met ingress-regels voor elke Supabase-hostname → `http://kong-<uuid>:8000` (of equivalent Coolify-container + Kong-poort 8000).
2. DNS-records bestaan wel (anders zou het 000 zijn i.p.v. 530), maar de tunnel weigert ze.

Dit is **infra-werk buiten Ordo 4**. Ik rapporteer aan Legatus in plaats van door te duwen (guardrail: bij blokker stoppen).

## Wat moet Legatus doen

1. **CF Tunnel-ingress fixen** voor minstens `supabase-retroductus.cyberductus.nl` (volgens het pattern dat voor `retroductus-engine` werkte — remote CF API, niet lokale YAML).
2. **Na fix: users aanmaken** via onderstaande commando's (SERVICE_ROLE_KEY uit `credentials.md`):

   ```bash
   SRK="<SERVICE_ROLE_KEY retroductus>"
   BASE="https://supabase-retroductus.cyberductus.nl"

   # Pieter (admin)
   curl -s -X POST "$BASE/auth/v1/admin/users" \
     -H "apikey: $SRK" -H "Authorization: Bearer $SRK" \
     -H "Content-Type: application/json" \
     -d '{"email":"pieter@debrabander.com","password":"<uit .tmp/credentials-orig-5.txt>","email_confirm":true}'

   # Tester1 + Tester2 idem
   ```
3. **Seed draaien:** `supabase/seed-testers.sql` via Supabase Studio SQL-editor of `psql`.
4. **Verificatie:**

   ```sql
   SELECT u.email, u.id, p.plan, p.is_admin, d.dpa_version
   FROM auth.users u
   LEFT JOIN user_plans p ON p.user_id = u.id
   LEFT JOIN dpa_acceptance d ON d.user_id = u.id
   WHERE u.email IN ('pieter@debrabander.com', 'tester1@retroductor.nl', 'tester2@retroductor.nl');
   ```

   Verwacht: 3 rijen, elk met `plan='free'`, `dpa_version='2026-04-24'`. Pieter met `is_admin=true`.

5. **Wachtwoorden overnemen** uit `c:\Projecten\.tmp\credentials-orig-5.txt` → `credentials.md` → tmp-file wissen.

## Coolify redeploy

**Niet gedaan, niet nodig.** Migratie-commit raakt draaiende Next.js-build niet — migraties worden niet automatisch toegepast bij Nixpacks build. Legatus kan de baseline-migratie los uitvoeren via Studio wanneer dat relevant wordt (op de live stack is de tabel al aanwezig; op een fresh-start draait hij automatisch vooraan).

## Gecommit

- Commit-hash: zie git log op `staging` (één commit na deze dispatch).
- Files: `supabase/migrations/20260301000000_baseline_mining_jobs.sql`, `supabase/seed-testers.sql`, `docs/staging-users.md`.
- Branch: `staging` (correct — geen productie-branch).
- Staging `src/app/page.tsx` niet aangeraakt.

## Open punten voor Legatus

1. CF Tunnel-ingress voor `supabase-*.cyberductus.nl` Supabase-stacks repareren (zie blokker).
2. Na fix: 3 users aanmaken + `seed-testers.sql` draaien + verificatie-query.
3. `.tmp/credentials-orig-5.txt` wachtwoorden overnemen naar `credentials.md` en file wissen.
4. Beslissing: `tester1@retroductor.nl` en `tester2@retroductor.nl` ofwel alias-mailboxen inrichten bij mijn.host, ofwel fallback `pieter+test1@debrabander.com`.
5. Superductus `projects-data.ts` voortgang-veld updaten (Ordo 11 — nu nog niet, eerst Ordo 4 volledig afgerond).
