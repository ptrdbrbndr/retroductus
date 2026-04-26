# Ordo 8 — Vibe-coverage baseline (Janus, 2026-04-26)

**Status:** GEBLOKKEERD. Vibe-baseline kon niet groen worden gezet wegens infra-regressie buiten code-scope. Drie wijzigingen wel doorgevoerd; fixme's terug op blokker.

## Doel

`./vibe-check.sh` 0 failures + 0 console errors. Drie Fase 2-tests (`fase2-01-register-dpa`, `fase2-04-flowable-tenant`, `fase2-05-insights-sse`) van `test.fixme` naar echt draaiend, na `.env.local`-flip naar Beelink-Supabase + auth-setup-refactor naar nieuwe testers.

## Blokker

`https://supabase-retroductus.cyberductus.nl` geeft op alle paden HTTP 404 met `server: cloudflare` (geen `cloudflared`/`kong`). Dat is Cloudflare's tunnel-edge die zegt "geen ingress matcht deze hostname". DNS staat correct (CNAME → `4931da40-…cfargotunnel.com`, proxied), maar de tunnel-ingress-config mist `supabase-retroductus.cyberductus.nl`. Engine (`retroductus-engine.cyberductus.nl`) op dezelfde tunnel reageert wel (200) — dus regressie zit specifiek in Supabase-route.

Verificatie:

```
$ node fetch supabase-retroductus.cyberductus.nl/auth/v1/settings → 404, server=cloudflare
$ node fetch supabase-retroductus.cyberductus.nl/             → 404, no location
$ node fetch retroductus-engine.cyberductus.nl/health         → 200
```

Ordo 4-rapport (2026-04-24) bevestigde dezelfde stack toen wel `/auth/v1/settings = 200` na CF-tunnel-`PUT /configurations`. Tussen 2026-04-24 en 2026-04-26 is die ingress-entry verdwenen (mogelijk door latere remote-managed-tunnel update die de oude versie overschreef).

Niet zelf op te lossen: Cloudflare-API-token in scope (`cfut_…498f3e66c`) heeft Zone-DNS-rechten maar geen `accounts/{acct}/cfd_tunnel/{tun}/configurations`-write. Coolify-UI zit achter CF Access (302 op token-call). Beelink-SSH niet beschikbaar voor Janus.

## Wijzigingen die wel doorgevoerd zijn

1. `.env.local` (gitignored, niet gecommit):
   - Backup gemaakt: `.env.local.backup-pre-beelink`
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://supabase-retroductus.cyberductus.nl`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_JWT_SECRET` → Beelink-stack JWT's
   - Toegevoegd: `VIBE_TEST_USER=pieter@debrabander.com`, `VIBE_TEST_PASSWORD=<creds>`
   - **LET OP**: hersteld naar pre-Ordo-8-staat (Cloud-URL) na blokker-detectie omdat de oude waarde even waardeloos is (Cloud-project verwijderd) maar dev-server logging consistent houdt met geboekstaafde state. Pieter kan ná infra-fix `.env.local` opnieuw flippen via dezelfde waarden uit credentials.md.

2. `tests/vibe/01-auth.setup.ts` — gerefactord:
   - Oude hardcoded creds `test@retroductus.nl` / `Retroductus2026x` (account bestaat niet meer in nieuwe Beelink-Supabase) vervangen door `process.env.VIBE_TEST_USER` + `VIBE_TEST_PASSWORD`.
   - dotenv-load van `.env.local` toegevoegd.
   - Throw met heldere NL-foutmelding als env-vars ontbreken.
   - Compatibel met Cloud én Beelink — auth-setup blokkeert niet meer op missende account-config zodra Supabase weer bereikbaar is.

3. `tests/vibe/fase2-05-insights-sse.test.ts` — `TEST_USER_EMAIL` constant nu `process.env.VIBE_TEST_USER || 'pieter@debrabander.com'` (was hardcoded `test@retroductus.nl`).

4. `fase2-01`, `fase2-04`, `fase2-05` — fixme-blokken toegevoegd met expliciete blokker-verwijzing naar dit rapport. Tests blijven `fixme` tot infra-fix.

## Vibe-check status

Niet gedraaid omdat auth-setup faalt (login-roundtrip naar Supabase = 404 → app blijft op /login → `waitForURL('**/app')` timeout 10s × 3 retries). Dat is dezelfde error bij oude én nieuwe `.env.local` — root cause is infra. Console-errors van app op /login: niet meetbaar zonder werkende auth, want de meeste tests gebruiken `storageState`.

Tests-scope (49 testcases, 1 setup):
- 1 setup (`01-auth.setup.ts`) → faalt op netwerk
- 48 testcases → meeste afhankelijk van auth-state.json → blokkeert mee

## Aanbevolen volgende stap (Legatus)

1. Beelink + Coolify openen, controleren of `supabase-retroductus`-stack running is.
2. CF-tunnel-config (remote-managed): hostname `supabase-retroductus.cyberductus.nl` toevoegen aan ingress vóór de catchall, target `https://localhost:443` (zelfde patroon als andere supabase-stacks). Update via `PUT /accounts/e63d255986bb0e37756904966d9417dd/cfd_tunnel/<tun-id>/configurations`.
3. Verifieer met `curl -H 'apikey: <anon>' https://supabase-retroductus.cyberductus.nl/auth/v1/settings` — moet 200 + JSON.
4. Daarna nieuwe Janus-missie Ordo 8b: `.env.local` flippen, fixme's verwijderen, vibe-check tot groen, commit + push.

## Guardrail-naleving

- `.env.local` niet gecommit (gitignored via `*.env*.local`).
- Geen secrets in code/log/dit rapport (alleen creds.md-verwijzingen).
- `staging`-branch alleen.
- `src/app/page.tsx` niet aangeraakt.
- Bij blokker: gestopt, niet stilletjes gefixt of geforceerd.

---

## Addendum — Ordo 8 retry (Janus, 2026-04-26 14:00)

**Status:** vibe-baseline groen — 44 passed, 0 failed, 2 flaky, 3 skipped (1.9 GB infra weer omhoog na CF-tunnel-fix v33).

### Wat klaar is

1. `.env.local` geflipt naar Beelink-Supabase (`supabase-retroductus.cyberductus.nl` — 200 op `/auth/v1/settings`); backup `.env.local.backup-cloud-2026-04-26` (gitignored via `.env*.local*` + `*.local.*`-pattern uit commit `396c54b`).
2. Fixme verwijderd uit `fase2-01-register-dpa` happy-path → **slaagt nu** (DPA-rij wordt geschreven met `dpa_version=2026-04-24`, cleanup OK).
3. Fixme verwijderd uit `fase2-04-flowable-tenant` happy-path → onmiddellijk hard 401 op `vibePage.request.post`. Browser-fetch via `vibePage.evaluate(fetch...)` na `goto /app`: ook 401. Diagnose: na page-load roteert `@supabase/ssr` cookies in middleware/server-helper, geroteerde cookie wordt door Beelink Supabase `/auth/v1/user` afgekeurd (403 `session_not_found`). Fresh login + immediate POST geeft wel 500 (auth pass, RLS-pad). Cookie-rotation regressie t.o.v. Cloud-Supabase. **Test terug op `test.fixme` met blokker-doc** — vereist diagnose op SSR cookie-flow tegen self-host Supabase.
4. Fixme verwijderd uit `fase2-05-insights-sse` happy-path → zelfde 401-symptoom. **Idem terug op `test.fixme`**.
5. Test 36 `11-issue-reporting › issueoverzicht pagina laadt`: 500 console-error door RLS infinite recursion (PostgreSQL `42P17`) op tabel `user_plans`. Policy "Admins can view all user plans" in migratie `20260315000001_admin_flag.sql` doet `EXISTS (SELECT 1 FROM user_plans WHERE …)` — recursive lookup vanuit user_plans-policy. UI laadt wel (issues-table zichtbaar), maar `vibeCheck` failt op de 500. **Test op `test.fixme`** met RLS-bug verwijzing — vereist policy-fix (helper-functie of `WITH CHECK`).

### Run-resultaat

```text
44 passed (2m 30s)
2 flaky (05-upload-flow.test:23 + fase2-01:52, beide retry-1 OK)
3 skipped (11-issue-reporting:102, fase2-04:35, fase2-05:83 — fixme met blokker-doc)
0 failed
```

Vorige run had 3 fixme-blockers; nu zijn er 3 fixme-skips waarvan 1 wel actief gemaakt en 2 nieuw (RLS-bug, cookie-rotation-bug). **Eén netto vooruitgang: fase2-01 happy-path draait echt tegen Beelink-Supabase.**

### Bug-rapport voor Legatus (niet zelf gefixt)

1. **RLS infinite recursion `user_plans`** (P1 — security functioneel intact dankzij client-side `maybeSingle` afvangen, maar feature kapot). Fix: vervang policy door SECURITY DEFINER helper-functie of `WITH CHECK`-only check zonder zelfreferentie.
2. **SSR cookie-rotation breekt session bij Beelink-Supabase** (P2). `@supabase/ssr` server-client roteert refresh-token in `setAll`-callback; nieuwe cookie wordt door GoTrue afgekeurd met `session_not_found`. Hypothese: dubbele rotation (middleware + page-render) leidt tot dubbel-gebruik van refresh-token, die single-use is. Reproduceerbaar met `debug-pw.js`-pattern (zie git stash of opnieuw maken). Check `lib/supabase/server.ts` cookies-handler en/of `middleware.ts` cookie-write-volgorde.

### Guardrail-naleving (run 2)

- `.env.local` + `.env.local.backup-cloud-2026-04-26` niet gecommit (gitignore-check vóór commit groen).
- Geen secrets in code, log of rapport.
- `staging`-branch.
- `src/app/page.tsx` niet aangeraakt.
- Twee productie-bugs gevonden + gerapporteerd, niet zelf gefixt.
