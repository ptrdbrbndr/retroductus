# Ordo tussen 2 en 3 — Branch-sync master -> staging

**Centurio:** Janus
**Datum:** 2026-04-24
**Missio:** merge `master` (31 commits voor) in `staging`, mét staging's 4 unieke commits behouden.

## Resultaat

Succes. Staging bevat nu alle Fase-1 features + security-hardening + docs-scaffold van master, plus staging's eigen vibe-tests en altijd-volledige-landing. Beide Coolify-apps live op de merge-commit.

- **Merge-commit:** `dba9b10` — `merge: master -> staging (Fase 1 features + hardening + docs)`
- **Voorafgaande commit op staging:** `daa61db` — `docs(fase-2): plan + spec + ADR 0003 + Ordo 1-3 missio-rapporten` (dit commit bundelt de 7 uncommitted docs + `.env` toegevoegd aan `.gitignore`)
- **GitHub push:** `5f051e0..dba9b10 staging-merge -> staging` (standaard push, geen force)
- **Hoofd-workdir:** fast-forward gepulled naar `dba9b10`. Worktree op `c:/tmp/retroductus-merge` opgeruimd, tempbranch `staging-merge` verwijderd.

## Conflict-resolution — 26 bestanden

| Bestand | Resolution | Toelichting |
|---|---|---|
| `src/app/page.tsx` | **staging (`--ours`)** | ABSOLUTE RULE: staging = volledige landing, geen ComingSoon. Geverifieerd: 0 hits. |
| `.gitignore` | **handmatig** | staging's `.tmp/` + master's `engine/.env` behouden; duplicate `.env` verwijderd; `*.env*.local` bleef. |
| `engine/*` (5 files: main.py, requirements.txt, routers/logs.py, e.d.) | master (`--theirs`) | master bevat volledige engine met auth/rate_limit/conformance/insights routers. |
| `package.json`, `package-lock.json` | master | superset van dependencies. |
| `playwright.config.ts`, `testing/vibe-core/base.fixture.ts`, `vibe-check.sh` | master | master's test-infra is consistent met 05-11 tests. |
| `tests/vibe/01-04*.ts` (4 files) | master | staging had kleine tweaks (env-vars voor credentials, networkidle); master's versie is consistent met 05-11 en behoudt dezelfde `data-testid` hooks. Staging's unieke 05+ tests bestaan niet → geen verlies. |
| `src/app/(auth)/*` (login, register, layout) + `src/app/app/**`, `src/app/api/upload/route.ts`, `src/app/auth/callback/route.ts`, `src/lib/supabase/server.ts`, `src/middleware.ts` | master | staging had stubs, master heeft volledige Supabase-auth + RLS. |

Geen conflict-markers achtergebleven (ripgrep 0 hits). Geen `ui/` opgeruimd (buiten scope).

## Validatie

```
page.tsx -> 0 "ComingSoon" hits            (ABSOLUTE RULE OK)
src/app/dpa/page.tsx -> aanwezig
supabase/migrations/ -> dpa_acceptance migration 20260316000002 aanwezig
```

Build-check overgeslagen conform plan (optioneel; Coolify bouwt toch). Geen leftover merge-markers.

## Coolify-herdeploy

Force-deploy getriggerd voor beide apps (auto-deploy-webhook was niet direct reactief):

| App | UUID | deployment_uuid | Eind-status |
|---|---|---|---|
| retroductus-ui | `cd1xaylx877wr431p1xzcjaf` | `ut4a3b8uuwfbswxqtt8vws5x` | **finished** (cyclus ~3 min) |
| retroductus-engine | `oesusoqqwfstloktovb1c6qb` | `rbnwk02jt1w91umpn0yfbza2` | **finished** (cyclus ~2.5 min) |

Beide gebouwd op commit `dba9b101b6f6c21a2ce00a1aea2a802187f6412a`.

## Curl-verificatie

```
# retroductor.nl/register (via Beelink-IP)
HTTP 200 | content_type=text/html; charset=utf-8 | size=11208
- ComingSoon hits: 0
- DPA/verwerkersovereenkomst hits: 1
- register-form/email/submit hits: 1

# retroductor.nl/ (landing)
HTTP 200 | size=53086
- ComingSoon hits: 0
- hero-title/pricing-section hits: 1

# retroductus-engine.cyberductus.nl/health
HTTP 200
```

## Afwijkingen

1. **`.env` was niet gitignored** op staging (alleen `*.env*.local` gematcht). Toegevoegd aan `.gitignore` vóór de merge (commit `daa61db`). `.env`-bestand (enkel `VIBE_BASE_URL=http://localhost:3200`, geen secret) bleef lokaal, niet gepusht.
2. **Coolify auto-deploy op push niet direct getriggerd** — oorzaak niet onderzocht (webhook-config mogelijk). Force-deploy via API werkte prima. Voor Ordo 3 is dit irrelevant: beide apps draaien nu op `dba9b10`.
3. **Staging's tests 01-04 vervangen door master's versie.** Ingegeven door consistentie met 05-11. Staging-tweaks (env-var-credentials, networkidle) verdienen mogelijk heroverweging bij volgende vibe-check cyclus, maar zijn nu niet load-bearing.

## Status voor Ordo 3

- Staging-branch is nu superset-in-feature van master, behalve dat `src/app/page.tsx` expliciet volledige landing blijft.
- DPA-pagina + migratie aanwezig; register-pagina linkt naar DPA.
- Ordo 3 (DPA-checkbox verplicht maken) kan nu tegen een schone staging aan.
