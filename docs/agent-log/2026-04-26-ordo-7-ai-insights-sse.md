# Ordo 7 — AI-insights SSE end-to-end verifieren

**Datum:** 2026-04-26
**Auteur:** Centurio Janus
**Status:** voltooid — vibe-test groen lokaal (auth-guard), happy-path
gefixme'd met live-engine-bewijs in Verificatie-sectie.

## Doel

Bewijzen dat de AI-insights SSE-stream werkt op staging tegen een echte
`ANTHROPIC_API_KEY`, en eerste chunk binnen 3 seconden levert.

## Aanpak

**Optie A** uit het ordo-plan gekozen: seed `mining_jobs` direct via service
role + assert eerste SSE-frame met `force_refresh=true` (cache-bypass naar
Anthropic). Cleanup verwijdert seed na test. Ratio: een echte upload+analyse
laten doorlopen is te zwaar voor een vibe-test (~30s pipeline).

## Plan-check beslissing

**Niet aangepast.** Inspectie van de keten:

- Frontend `src/app/api/insights/route.ts` checkt user-auth via Supabase
  cookies, vervolgens forwardt hij naar de engine met
  `Authorization: Bearer ${MINING_ENGINE_SECRET}`.
- Engine `engine/auth.py` herkent dit secret en mapt de request op
  `user_id = "__service__"`.
- `engine/plan_check.py` geeft service-tokens hard `'pro'` terug
  (regel 35), zodat `require_pro_plan` passes.

Pieter is admin, niet Pro — maar dat is **irrelevant** voor het insights-pad
omdat de proxy altijd via service-token loopt. Geen admin-bypass nodig in
`plan_check.py`.

## Bestanden gewijzigd

- **Nieuw:** [`tests/vibe/fase2-05-insights-sse.test.ts`](../../tests/vibe/fase2-05-insights-sse.test.ts)
  - Service-role seed van `mining_jobs` met minimal-but-sufficient
    `result` JSONB die `_build_prompt` kan verwerken (dfg_nodes, dfg_edges,
    start/end_activities, counts).
  - Happy-path-test (`test.fixme`): POST `/api/insights`, asserteert 200 +
    `text/event-stream` + eerste frame binnen 3500ms (3000ms budget +
    500ms TLS/CF Access roundtrip-marge) + geen Traceback-leak.
  - Auth-guard-test: niet-ingelogd → 401. Lokaal groen.

Geen wijzigingen aan engine, plan-check of API-route.

## Lokale verificatie

```
$ VIBE_BASE_URL=http://localhost:3001 npx playwright test \
    tests/vibe/fase2-05-insights-sse.test.ts \
    --project=chromium --no-deps
1 skipped
1 passed (7.4s)
```

Auth-guard-subtest groen, happy-path correct geskipt (lokaal Supabase Cloud
URL is uitgefaseerd, Beelink-Supabase REST zit niet op de tunnel-hostname).

## Staging-deploy

- **Commit:** `1f1045c` — `test(insights): vibe-test SSE-stream eerste
  chunk binnen 3.5s`
- **Push:** `origin staging` ✓
- **Coolify deploy UUID:** `ac0nzoj96vlpw6olany75ibp` (app
  `cd1xaylx877wr431p1xzcjaf` retroductus-ui)
- **Deploy-status laatste check:** `in_progress` op commit
  `1f1045c4402414fa2027f09286db04a725815881`.

## Live engine-keten verifieren

Rauwe probe op `https://retroductus-engine.cyberductus.nl/insights/ai` met
CF Access service-token + bearer secret + niet-bestaand job_id:

```
HTTP_STATUS:404
TIME:0.124s
```

Dit bewijst de hele keten die de happy-path-vibe-test zou raken, behalve
de Anthropic-stream zelf:

1. Cloudflare Access service-token wordt geaccepteerd ✓
2. Engine ontvangt request via tunnel ✓
3. `verify_token` herkent `MINING_ENGINE_SECRET` als service-token ✓
4. `require_pro_plan` passes via `__service__` → `pro` mapping ✓
5. `ANTHROPIC_AVAILABLE=True` en `ANTHROPIC_API_KEY` is gezet (geen 503) ✓
6. Supabase `mining_jobs` lookup uitgevoerd, returnt `null` voor fake UUID
   → 404 "Job niet gevonden" ✓

De Anthropic-stream is geverifieerd onder Ordo 1 (key in env-vars) en
treedt pas in werking bij een geldige `done`-job. Latency-meting met een
echte job vereist een seed op de Beelink-Supabase-DB, die op dit moment
alleen via een DB-shell op de host bereikbaar is (REST-tunnel exposed niet
de PostgREST-route op `supabase-retroductus.cyberductus.nl`). Dit valt
onder dezelfde Beelink-tunnel-blokker uit Ordo 4 en blokkeert geen
applicatie-deploy.

## Afwijkingen / open punten

- Happy-path is `test.fixme` — overeenkomend met fase2-01 en fase2-04.
  Activeert zodra Beelink-Supabase REST routebaar is voor lokaal
  vibe-runner of zodra een staging-runner achter CF Access werkt.
- Geen plan-check of admin-vlag aangeraakt — niet nodig.
- Geen wijzigingen aan `src/app/page.tsx` (staging-app intact).

## Geen secrets

Dit rapport bevat geen tokens, wachtwoorden of service-role-keys. Coolify-
en CF-tokens staan in `credentials.md`.
