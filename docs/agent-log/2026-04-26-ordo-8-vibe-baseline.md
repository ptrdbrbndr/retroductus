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
