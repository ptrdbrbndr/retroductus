# Bugfix-missio: RLS infinite recursion + SSR cookie-rotation (Janus, 2026-04-26)

**Status:** beide bugs gefixt en gedeployd. Auth-flow werkt volledig (geen 401/session_not_found meer). RLS 42P17 weg. fase2-04 + fase2-05 happy-paths blokkeren nog op separate, niet-auth-gerelateerde issues — opnieuw gemarkeerd `test.fixme` met nieuwe blokker-doc.

## Bug 1 — RLS infinite recursion op user_plans

### Root cause

Migratie `20260315000001_admin_flag.sql` definieerde policy "Admins can view all user plans" met `EXISTS (SELECT 1 FROM user_plans WHERE …)` vanuit een policy óp diezelfde tabel → PostgreSQL `42P17`.

### Fix

Nieuwe migratie [`supabase/migrations/20260426000002_fix_admin_rls_recursion.sql`](../../supabase/migrations/20260426000002_fix_admin_rls_recursion.sql):
- `SECURITY DEFINER` helper-functie `public.is_current_user_admin()` (RLS-bypass voor self-lookup, `STABLE`, `SET search_path = public, pg_temp`).
- `EXECUTE`-grant alleen voor `authenticated`.
- Oude policy gedropped + vervangen door `USING (public.is_current_user_admin())`.

### Toepassing & verificatie (live Beelink-Supabase)

```text
SSH ptrdbrbndr@192.168.68.69 → docker exec supabase-db-nfjxj1dahpu416ywxpdiqya1 psql -U supabase_admin -d postgres -f /tmp/20260426000002_fix_admin_rls_recursion.sql
→ CREATE FUNCTION / REVOKE / GRANT / DROP POLICY / CREATE POLICY (5x OK)

\df+ public.is_current_user_admin → owner=supabase_admin · security=definer · stable
\d public.user_plans → policy "Admins can view all user plans" USING (is_current_user_admin())

POST /auth/v1/token (Pieter) → access_token (623 chars), user_id bbe7274b-…
GET  /rest/v1/user_plans?select=user_id,plan,is_admin → HTTP 200 + 3 rows
   Pieter (admin)   ziet alle drie ✓ — geen 42P17.
```

### Commit

`8b673c8` op `staging` (`fix(rls): user_plans admin-policy zonder infinite recursion`). DDL al op live DB; geen redeploy nodig.

## Bug 2 — SSR cookie-rotation breekt session

### Root cause

`src/middleware.ts` regel 16 (vóór fix):
```ts
cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
```

De canonical Supabase Next.js 15 SSR-pattern verwacht `request.cookies.set({ name, value, ...options })`. Door de `options` weg te gooien kreeg `NextResponse.next({ request })` een request-mirror waarin de geroteerde cookie geen `path`/`sameSite`/`httpOnly` had — in combinatie met de strikte single-use refresh-token-revocation van self-host GoTrue (Beelink-Supabase) leidde dat tot dubbele rotation-poging tijdens dezelfde request en daarna `session_not_found` (403) op de volgende `auth.getUser()`-call. Cloud-Supabase tolereerde dit gedrag.

### Fix

`src/middleware.ts` (commit `267ad7e`):

```diff
-    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
+    cookiesToSet.forEach(({ name, value, options }) =>
+      request.cookies.set({ name, value, ...options })
+    )
     supabaseResponse = NextResponse.next({ request })
     cookiesToSet.forEach(({ name, value, options }) =>
-      supabaseResponse.cookies.set(name, value, options)
+      supabaseResponse.cookies.set({ name, value, ...options })
     )
```

`src/lib/supabase/server.ts` had al de canonical try/catch op `cookieStore.set` — geen wijziging nodig.

### Verificatie (lokaal tegen Beelink-Supabase)

```text
node test-bug2.js (Playwright + auth-state.json):
   POST /api/flowable-sync → status 500, body {"error":"Kon job niet aanmaken"}
   POST /api/insights      → status 500, body {"detail":"Interne serverfout"}
```

Géén 401, géén `session_not_found`. Auth-flow passeert volledig — bevestigt dat SSR-cookie-rotation gefixt is. Resterende 500's zijn andere bugs (zie hieronder).

### Commit & deploy

- Commit `267ad7e` op `staging`.
- Coolify force-deploy retroductus-ui (`cd1xaylx877wr431p1xzcjaf`) — deployment UUID `uomc5n1o1xqncsx8kh0nn764` → status `finished`.

## Vibe-coverage

Lokaal `./vibe-check.sh` (Beelink-Supabase, eigen dev-server poort 3001):

| State | Vorig (Ordo 8 retry, d67f010) | Nu (Ordo 8b, c406b61) |
|---|---|---|
| Passed | 44 | **46** |
| Flaky | 2 | 0 |
| Skipped | 3 (fixme) | 3 (fixme) |
| Failed | 0 | 0 |

Netto: +2 passes (waaronder vroegere flaky's nu stabiel). Geen failures.

## Resterende fixme's (niet binnen scope)

Beide tests passen Bug 2 (auth) — auth-flow werkt — maar blokkeren nu op nieuwe, niet-auth-gerelateerde 500's:

1. **fase2-04** (`flowable-sync stempelt …`): `mining_jobs`-insert in `src/app/api/flowable-sync/route.ts` regel 47-52 schrijft naar kolommen `tenant_id` en `source` die in de Beelink-DB-schema **niet bestaan** (gecheckt via `\d public.mining_jobs`). 500 met `{"error":"Kon job niet aanmaken"}`. Vereist schema-migratie of route-fix; Janus-scope was Bug 1+2.
2. **fase2-05** (`/api/insights …`): engine retourneert 500 met `{"detail":"Interne serverfout"}` op `/insights/ai`. Vermoedelijk Anthropic-key of engine-state. Engine-side diagnose, niet UI-side.

Beide tests zijn opnieuw `test.fixme` gemarkeerd met bijgewerkte blokker-doc verwijzend naar nieuwe scope. Commit `c406b61`.

## Guardrail-naleving

- `staging`-branch. `master` niet aangeraakt.
- `src/app/page.tsx` niet aangeraakt.
- DDL pas op live na file-creatie + lokale review.
- Geen secrets in code, log of dit rapport.
- Bug 2 fix volgt canonical Supabase pattern A (request.cookies.set met options) — geen ander root-cause aangenomen.
- Lokale validatie vóór commit + deploy (Playwright-test bewees: geen 401 meer).

## Afwijkingen

Opdracht zei: "fase2-04 + fase2-05 fixme weg, vibe-check weer groen — moet 47 pass / 0 fail (was 44 pass / 3 skip)." Behaald: 46 pass / 0 fail / 3 skip. Reden: na auth-fix vielen happy-paths uit elkaar over **andere** bugs in business-logic (mining_jobs schema mismatch + engine 500). Deze zijn buiten Janus' Bug 1+2 missio-scope en daarom expliciet teruggezet op `test.fixme` met nieuwe blokker-doc, conform "Bij blokker: stop + rapporteer."

## Referenties

- Vorig rapport (blokkers): `docs/agent-log/2026-04-26-ordo-8-vibe-baseline.md`
- Migratie: `supabase/migrations/20260426000002_fix_admin_rls_recursion.sql`
- Commits: `8b673c8` (Bug 1), `267ad7e` (Bug 2), `c406b61` (fixme-doc-update)
- Deploy UUID: `uomc5n1o1xqncsx8kh0nn764` (Coolify retroductus-ui)
