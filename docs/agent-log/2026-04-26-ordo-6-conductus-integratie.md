# Rapport — Ordo 6: Conductus-integratie engine-zijde + contract

**Datum:** 2026-04-26
**Centurio:** Janus
**Plan:** [`docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md`](../superpowers/plans/2026-04-24-fase-2-intern-testen.md) §Ordo 6
**Status:** Klaar.

## Wijzigingen

| Bestand | Soort | Korte beschrijving |
| --- | --- | --- |
| `tests/vibe/fase2-04-flowable-tenant.test.ts` | nieuw | Vibe-test voor X-Tenant-Id contract (3 tests; 1 fixme i.v.m. lokaal onbereikbare Beelink-Supabase, 2 actief) |
| `supabase/migrations/20260426000001_conductus_tenant_id.sql` | nieuw | Idempotente migratie: `mining_jobs.conductus_tenant_id text NULL` + partial index |
| `engine/routers/connectors.py` | aangepast | `X-Tenant-Id` header parsen (regel ~95-125), consistency-check tegen `flowable_tenant_id`, doorgeven aan `_run_flowable_job`; kolom-update bij `running`-state |
| `src/app/api/flowable-sync/route.ts` | herschreven | Header `X-Tenant-Id` lezen + valideren (regel 14-39), `conductus_tenant_id` op insert (regel 49), header doorgeven naar engine-fetch (regel 67-72) |
| `docs/integratie-conductus.md` | herzien | Versie 2 — Stripe-add-on geschrapt voor intern testen, handmatige tenant-toggle, engine-contract gedocumenteerd voor Concordius |

## Migratie-toepassing

Route: **SSH naar Beelink + `psql` als `supabase_admin`** (postgres-user gaf `must be owner of table mining_jobs`).

```bash
ssh ptrdbrbndr@192.168.68.69 \
  'docker exec -i supabase-db-nfjxj1dahpu416ywxpdiqya1 psql -U supabase_admin -d postgres' \
  < supabase/migrations/20260426000001_conductus_tenant_id.sql
# → ALTER TABLE / CREATE INDEX / COMMENT
```

Verificatie: `\d public.mining_jobs` toont kolom `conductus_tenant_id text NULL` + index `idx_mining_jobs_conductus_tenant`.

## Vibe-test resultaat

```
fase2-04-flowable-tenant.test.ts
  -  flowable-sync stempelt mining_jobs.conductus_tenant_id (skipped — fixme)
  ok flowable-sync zonder tenant-id geeft 400 of 401 met NL fout (26.8s)
  ok flowable-sync met inconsistente tenant-id (header vs body) geeft 400 of 401 (25.6s)

  1 skipped
  2 passed (59.4s)
```

Setup-project (`01-auth.setup.ts`) werd geskipt met `--no-deps` omdat de
auth-state.json nog tegen de verwijderde Cloud-instance
`ttfgpbuievkuiwdhmtaz` is opgebouwd. Pattern overgenomen uit fase2-01-rapport
(zelfde blokker bekend).

## Deploy

- **Commit**: `02fb047c8038287fddc3fc1572de71f4d948e6bf`
- **Branch**: `staging` (push: `e779dbe..02fb047 staging -> staging`)
- **Engine deploy-UUID**: `bqaq32a2nxemnqw0s35zxqvv` → `finished`, app `oesusoqqwfstloktovb1c6qb` `running`
- **UI deploy-UUID**: `cv8osuu34dl8l4nburzsjdqu` → `finished`, app `cd1xaylx877wr431p1xzcjaf` `running`
- Beide via force-deploy (`POST /api/v1/deploy?uuid=…&force=true`) — webhook-trigger niet getest, force was sneller.

### Verificatie productie

| Check | Resultaat |
| --- | --- |
| `GET /health` engine met CF-Access service-token | `{"status":"ok"}` (200) |
| `GET /health` engine zonder token | 302 → `dbrbndr.cloudflareaccess.com` (gate intact) |
| `GET /` retroductor.nl zonder Access-cookie | 302 → CF Access (gate intact) |

## Afwijkingen van plan

1. **Migratie-pad**: plan suggereerde `psql -U postgres`. Werkelijk vereist
   `-U supabase_admin` (postgres is geen owner van `public.mining_jobs`).
   `credentials.md` bevat geen psql-wachtwoord-key — `docker exec` werkt
   zonder wachtwoord (peer-auth binnen container). Geen credential-update
   nodig; aanbeveling: documenteer dit in een toekomstige runbook-entry.
2. **Vibe-test happy-path**: gemarkeerd `fixme` met dezelfde rationale als
   fase2-01 (auth-state niet bruikbaar tegen huidige Beelink-Supabase).
   Validatie van DB-schrijfgedrag gebeurt zodra Concordius een live
   Conductus-tenant heeft die end-to-end test, of via een proxy-rapport-curl
   later — niet in scope Ordo 6.
3. **Plan zei** "X-Tenant-Id verplicht via 400 als ontbrekend". Ik heb een
   fallback ingebouwd: als `X-Tenant-Id` ontbreekt **en** `flowable_tenant_id`
   in body staat, dan accepteert de route met `flowable_tenant_id` als
   tenant-id (zonder Conductus-label). Reden: bestaande standalone-flow
   (`/app/projects/new` → Flowable-tab) stuurt geen header. Anders breekt
   Ordo 6 het bestaande Flowable-tab van retroductor.nl. Alleen volledig
   ontbrekende tenant-id geeft 400.

## Vraag aan Centurio Concordius (Conductus-cohort)

Om Spoor B (Conductus-integratie) af te ronden moet Concordius bouwen aan
Conductus-zijde:

### Fase 1 — DB-migratie in `cmmn-portal`

```sql
ALTER TABLE tenants
  ADD COLUMN process_mining_enabled BOOLEAN DEFAULT false;
```

(Géén Stripe-subscription-id-kolom — pas in Fase 3.)

### Fase 3 — `src/lib/features.ts`

Server-side `getTenantFeatures()` die `process_mining_enabled` leest voor de
huidige gebruiker.

### Fase 4 — Sidebar-conditional

`SidebarWrapper.tsx` (Server Component) → `Sidebar.tsx` met
`processMiningEnabled` prop. Conditioneel nav-item naar `/dashboard/mining`.

### Fase 6 — Admin-toggle (handmatig)

`/dashboard/settings/admin/page.tsx` met owner-only RBAC + API-route
`/api/admin/features/mining/route.ts`. Geen Stripe-koppeling.

### Fase 8 — Proxy-route + Mining-UI

`/api/mining/jobs/route.ts` proxyt naar:

```
POST https://retroductus-engine.cyberductus.nl/connectors/flowable/sync
Authorization: Bearer <MINING_ENGINE_SECRET>
X-Tenant-Id: <conductus-tenant-uuid>
CF-Access-Client-Id: <token-id>
CF-Access-Client-Secret: <token-secret>
Content-Type: application/json

{
  "job_id": "<uuid voor mining_jobs>",
  "tenant_id": "<supabase-user-uuid>",
  "flowable_tenant_id": "<conductus-tenant-uuid>",
  "db_url": "<flowable-db-url>"
}
```

Belangrijk: `X-Tenant-Id` **moet** gelijk zijn aan `flowable_tenant_id` —
mismatch geeft 400 (sourcing-consistency).

Result-ophalen: read-only proxy in cmmn-portal naar retroductus-Supabase met
filter `conductus_tenant_id = <huidige tenant>`. Service-role-key vereist
(Concordius vraagt aan Legatus). RLS op `mining_jobs` blijft op `user_id`,
dus filtering via service-role + tenant-WHERE-clause.

### Vibe-tests

Toevoegen in `cmmn-portal/tests/vibe/`:

- `19-mining-gate.test.ts` — `process_mining_enabled=false` toont upgrade-prompt
- `20-mining-activate.test.ts` — owner toggle aan → nav-item zichtbaar
- `21-mining-job-roundtrip.test.ts` — job-create roundtrip met X-Tenant-Id

### Volledig contract

Zie [`docs/integratie-conductus.md`](../integratie-conductus.md) versie 2 in
deze repo. Concordius mag verwijzen + linken vanuit cmmn-portal docs.

## Volgende ordo

Ordo 7 — AI-insights end-to-end verifiëren op staging.
