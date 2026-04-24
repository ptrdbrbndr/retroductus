# Status-audit Retroductus — 24 april 2026

**Auteur:** Explorator (dispatch door Legatus)
**Doel:** inventarisatie vóór Slag "Fase 2 — intern testen"
**Leesmodus:** alleen binnen `c:\Projecten\retroductus\`, geen wijzigingen.

---

## 1. Applicatie-state

### Landing & Auth
- ✅ **Landing** — `src/app/page.tsx` → `ComingSoon` (master); `staging` heeft volledige landingspagina
- ✅ **Login** — `src/app/(auth)/login/page.tsx` — Supabase-integratie, e-mail + wachtwoord-validatie
- ✅ **Register** — `src/app/(auth)/register/page.tsx` — aanwezig
- ✅ **Auth callback** — `src/app/auth/callback/route.ts` — Supabase OAuth-flow

### Dashboard & projecten
- ✅ **Dashboard** — `src/app/app/page.tsx` — mining-jobs overzicht met status-badges (done / running / pending / error), project-tellers
- ✅ **Projects list** — gequeryd uit `mining_jobs` tabel, gefilterd op `user_id` via RLS
- ✅ **Project nieuw (upload + Flowable)** — `src/app/app/projects/new/page.tsx` — twee tabs: CSV/XES upload en Flowable-DB-koppeling met test-verbinding

### Analyse-flows
- ✅ **DFG visualisatie** — `src/app/app/projects/[id]/dotted/page.tsx`, `/bpmn/page.tsx` — routes aanwezig, `@xyflow/react` + `bpmn-js`
- ✅ **Conformance report** — `/conformance/page.tsx` + `/api/conformance/route.ts` → engine-forwarding
- ✅ **AI insights** — `/insights/page.tsx` + `/api/insights/route.ts` — SSE-stream via Anthropic (Pro plan)
- 🟡 **Statistics, variants, performance, simulation** — routes aanwezig, inhoud niet geverifieerd (vermoedelijk skelet met engine-data)

### Aanvullende flows
- ✅ **DPA/privacy** — `/dpa/page.tsx` volledig uitgewerkt (5 artikelen, subverwerkers-tabel, rechten-info)
- 🟡 **Issues / support** — `/app/settings/issues/page.tsx` + `/api/issues/[id]/route.ts` — UI-skelet, geen backend-flow waargenomen
- 🟡 **Settings** — `/app/settings/page.tsx` — alleen issues-link, geen account / plan-instellingen

---

## 2. Mining Engine (`engine/`)

### Architectuur
- FastAPI (`engine/main.py`) met 5 routers: `logs`, `analysis`, `connectors`, `insights`, `conformance`
- 11 Python-modules: main, auth, rate_limit, plan_check + routers
- PM4Py niet volledig gelezen, maar routers impliceren DFG / stats / conformance
- Rate limiting per minuut: 3 (free), 10 (starter), 30 (pro), 60 (enterprise) — in-memory teller

### Auth
- Hybride: Bearer `MINING_ENGINE_SECRET` (service-to-service vanuit Next.js proxy) + Supabase JWT (directe toegang, toekomstig)
- Service-key returnt `__service__` als `user_id`, rate-limit bypass via 1000 req/min
- JWT-validatie: HS256 met `SUPABASE_JWT_SECRET`, audience `authenticated`

### Deploy
- Railway-config aanwezig: `engine/railway.toml` — health-check `/health`, restart-on-failure
- Env-vars vereist: `MINING_ENGINE_SECRET`, `SUPABASE_JWT_SECRET`
- Geen Dockerfile / Procfile zichtbaar → PM4Py-deps bouwen op Railway onduidelijk

---

## 3. Data-model (Supabase)

### Migraties (6 totaal, alle maart 2026)
1. `20260314000001_rls_tenant_isolation.sql` — `mining_jobs` RLS op `user_id`
2. `20260314000002_user_plans.sql` — `user_plans` (plan free/starter/pro/enterprise, updated_at)
3. `20260315000001_admin_flag.sql` — vermoedelijk `is_admin` kolom
4. `20260315000002_issues.sql` — `issues` (status, category, priority, admin_notes, 2-jr retentie)
5. `20260316000001_add_filename_to_mining_jobs.sql` — `filename` kolom
6. `20260316000002_dpa_acceptance.sql` — `dpa_acceptance` (accepted_at, dpa_version, ip_address)

### Tabellen in scope
- `mining_jobs` (RLS: user-geïsoleerd, levenslang)
- `user_plans` (RLS: eigen plan, levenslang, DELETE CASCADE met `auth.users`)
- `dpa_acceptance` (RLS: eigen acceptatie, levenslang, DELETE CASCADE)
- `issues` (RLS: auth-users zien + creëren, admins deleten, retentie 2 jaar)
- `subscribers` — aangeroepen door `/api/subscribe`, schema niet in migrations gevonden

---

## 4. Stripe-voorbereiding

### Aanwezig
- `user_plans` tabel (plan-kolom) — kan plan-state dragen
- Rate-limiting structuur in engine op basis van plan
- `/api/subscribe/route.ts` — alleen e-mail-waitlist, geen betaling

### Ontbrekend
- ❌ Geen `stripe` / `@stripe/stripe-js` in `package.json`
- ❌ Geen `/api/checkout`, `/api/webhook`, `/api/plans` routes
- ❌ Geen `src/lib/stripe/plans.ts` of Price-ID-config
- ❌ Geen Stripe env-vars in `.env.example`
- ❌ Geen checkout-flow in `/app/settings`

**Conclusie:** kaal. Enige voorbereiding is `user_plans` + rate-limiting. Haakje voor prep-only Stripe ontbreekt.

---

## 5. Conductus-koppeling

- ✅ `/api/flowable-test/route.ts` — test-ping naar engine `POST /connectors/flowable/test`
- ✅ `/api/flowable-sync/route.ts` — fire-and-forget: `mining_job` creëren (status=pending), engine async starten
- ✅ Frontend: `/app/projects/new/page.tsx` — "Flowable koppelen" tab (DB-URL + Tenant-ID input, test-button)
- ✅ `mining_jobs` ondersteunt `source = 'flowable'`, `filename = 'flowable:{tenant_id}'`

### Engine-zijde
- Router `/connectors` aanwezig; routers voor `flowable/sync` en `flowable/test` verwacht

### Gat
- Geen integratietest / tenant-isolation-test voor Conductus-tenants

---

## 6. Tests (vibe)

- ✅ `playwright.config.ts` — chromium-profiel met setup-phase, baseURL `http://localhost:3001`
- ✅ `vibe-check.sh` — `npx playwright test --reporter=list`
- ✅ `test-results/.last-run.json` — status `passed`, `failedTests: []` (16 maart 16:37)
- ❌ `tests/`-dir lijkt leeg of niet gesynced op vrije check — vraag voor cohort: tellen

---

## 7. Deploy-status

### Vercel (frontend)
- ✅ `vercel.json` — `next` framework, `npm install`, `npm run build`, `.next` output
- ✅ Vercel-project bestaat (`ptrdbrbndrs-projects/retroductus`)
- 🟡 **Gat:** geen `retroductor.nl` alias zichtbaar
- 🟡 Env-vars: `.env.example` heeft `MINING_ENGINE_URL` (hardcoded `https://api.retroductor.nl`) + placeholders

### Railway (engine)
- ✅ `engine/railway.toml` — health-check `/health`, restart-on-failure
- ✅ Verwacht env: `MINING_ENGINE_SECRET` + `SUPABASE_JWT_SECRET`
- 🟡 Geen Docker/Procfile zichtbaar → build-config onduidelijk

### Env-volledigheid
- `.env.example`: 5 vars (3× Supabase, 2× Mining-Engine, 1× Anthropic)
- Ontbrekend: Stripe-prep-vars, `.nvmrc`, Python-versie voor engine

---

## 8. Openstaande gaten voor "Fase 2 intern testen"

Gesorteerd op blokkerend-heid:

1. **Engine draait daadwerkelijk op Railway** (S) — health-check groen, logs leesbaar?
2. **Vercel-alias `retroductor.nl`** (S) — DNS + Vercel-alias koppelen
3. **Whitelist-only toegang** (S/M) — Vercel deployment-protection of e-mail-allowlist in middleware
4. **DPA-acceptatie-flow in register** (S) — forward in register-flow, niet alleen backlink
5. **Interne tester-seeding** (S) — set test-users in Supabase + `staging-users.md` bijwerken
6. **Stripe prep-only skeleton** (M) — SDK + env-placeholders + `/api/checkout` stub + `src/lib/stripe/plans.ts` + `user_plans` default `free`. Géén live Price ID, géén webhook dat state flipt.
7. **Tenant-isolation voor Conductus-tenants** (M) — hoe koppelen we Conductus-tenants aan app-users? Design + RLS + vibe-test `tenant-isolation`
8. **Issues-backend + admin-view** (M) — admin-dashboard om issues te zien/bewerken, nodig voor interne testrapportage
9. **AI-insights end-to-end verifiëren** (S) — `ANTHROPIC_API_KEY` geldig, SSE-stream lokaal en op staging werkend
10. **Retentie-cleanup-job** (M) — event-logs na 30d verwijderen; DPA belooft het

---

## 9. DPA & privacy

- ✅ DPA-pagina volledig uitgewerkt
- ✅ Retentie in schema:
  - Event logs: 30 dagen max (na analyse)
  - Analyse-resultaten: levenslang (zolang account)
  - Accounts + DPA-acceptatie: levenslang, DELETE CASCADE
  - Issues: 2 jaar
- 🟡 Geen forward-flow in register (alleen backlink naar `/dpa`)
- 🟡 Geen UI-knop voor account-verwijdering

---

## 10. Verrassingen & risico's

1. Hardcoded `MINING_ENGINE_URL=https://api.retroductor.nl` in `.env.example` — breekt als DNS/engine niet live is
2. Rate-limit in-memory — bij pod-restart reset counter; gebruiker kan limiet omzeilen
3. Flowable sync is fire-and-forget zonder retry — mislukte sync blijft op `status=error`
4. Geen zichtbare UI voor account-verwijdering, terwijl DPA `DELETE CASCADE` belooft
5. `subscribers`-tabel bestaat wel via `/api/subscribe` maar heeft geen migration → schema-drift risico
6. `test-results/.last-run.json` is groen, maar `tests/`-dir lijkt leeg of niet zichtbaar — vibe-coverage onzeker
7. `ANTHROPIC_API_KEY` placeholder in `.env.example`, engine→Anthropic auth niet geverifieerd
8. Rate-limiting zit in engine, geen UI-feedback bij 429 — gebruiker krijgt mogelijk harde foutmelding
9. Port 3001 hardcoded (`dev` + `start`) — conflicteert als port bezet is
10. Issue-categorieën als enum in schema — uitbreiden vereist migratie

---

## Conclusie

**Kern-readiness Fase 2 intern testen:**
- Auth, dashboard, upload, Flowable-koppeling, DFG/conformance: functioneel
- Stripe-voorbereiding: kaal
- Engine-deploy: configuratie aanwezig, feitelijk draaien onbekend
- Tests: setup compleet, coverage onzeker
- Privacy/DPA: pagina klaar, acceptatie-flow in register ontbreekt

**Top-4 blokkerend voor intern testen:** engine feitelijk draaien (#1), Vercel-alias + whitelist (#2+#3), DPA-flow in register (#4), tester-seeding (#5). Stripe prep (#6) en Conductus-isolatie (#7) erna.
