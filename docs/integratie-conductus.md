# Stappenplan: PM4Py integratie in Conductus

**Versie 2 — 2026-04-26 (Fase 2 intern testen)**
Vorige versie: 2026-03-14 (Stripe-add-on aanpak — geschrapt voor intern testen).

Dit document is het integratie-contract tussen Retroductus (Centurio Janus) en
Conductus (Centurio Concordius). Retroductus levert de engine + frontend-proxy;
Concordius bouwt de Conductus-zijde van de integratie.

---

## Status per fase (Fase 2 intern testen)

| Fase | Onderdeel | Status Fase 2 | Owner |
| --- | --- | --- | --- |
| 1 | DB-feature-flag (`tenants.process_mining_enabled`) | NODIG | Concordius |
| 2 | Stripe add-on product (€15/mnd) | **GESCHRAPT** voor intern testen — komt terug bij Fase 3 (publieke beta) | — |
| 3 | Feature-check utility (`getTenantFeatures()`) | NODIG | Concordius |
| 4 | Sidebar — conditioneel nav-item | NODIG | Concordius |
| 5 | Billing add-on UI | **GESCHRAPT** voor intern testen | — |
| 6 | Admin-toggle | **AANGEPAST**: handmatige override door Legatus (Pieter) — geen Stripe-koppeling. Concordius bouwt UI + API-route. | Concordius |
| 7 | Mining engine (FastAPI + PM4Py) | KLAAR | Janus |
| 8 | Conductus proxy-route + Mining UI in dashboard | NODIG — leest dit document voor het engine-contract | Concordius |
| 9 | Vibe-tests in cmmn-portal | NODIG | Concordius |

---

## Engine-contract (Spoor B — voor Concordius)

### Endpoints

De engine draait op `https://retroductus-engine.cyberductus.nl` (Beelink/Coolify,
Cloudflare Tunnel + Access). Voor service-to-service-aanroepen vanuit Conductus:

- **CF Access service-token** vereist (`CF-Access-Client-Id` + `CF-Access-Client-Secret`
  headers) — Legatus zet token op naam `conductus-retroductus-engine`.
- **Bearer token** met `MINING_ENGINE_SECRET` (zelfde secret als retroductus-frontend).

### `POST /connectors/flowable/sync`

Start een Flowable-sync mining-job in de engine als achtergrondtaak.

**Headers:**

```http
Authorization: Bearer <MINING_ENGINE_SECRET>
Content-Type: application/json
X-Tenant-Id: <conductus-tenant-uuid>           # OPTIONEEL — sourcing-label
CF-Access-Client-Id: <id>                      # alleen vanuit Conductus
CF-Access-Client-Secret: <secret>              # alleen vanuit Conductus
```

**Body:**

```json
{
  "job_id": "uuid-v4-van-mining_jobs-rij",
  "tenant_id": "supabase-user-uuid (eigenaar van de job in retroductus-DB)",
  "flowable_tenant_id": "tenant-id zoals bekend in Flowable ACT_HI_*",
  "db_url": "postgresql://user:pass@host:5432/flowable"
}
```

**Validatie:**

- Wanneer `X-Tenant-Id` aanwezig is **moet** hij gelijk zijn aan `flowable_tenant_id`.
  Mismatch → 400 met NL fout. Reden: voorkomt inconsistente sourcing-labels op
  `mining_jobs.conductus_tenant_id`.
- Wanneer `X-Tenant-Id` ontbreekt: job wordt aangemaakt zonder Conductus-label.

**Response (202 Accepted, fire-and-forget):**

```json
{ "accepted": true, "job_id": "..." }
```

De engine doet de zware analyse asynchroon en update `mining_jobs` in de
retroductus Supabase-DB.

### `POST /connectors/flowable/test`

Test alleen de Flowable-DB-verbinding (telt events). Headers idem; body alleen
`{ "db_url": "..." }`. Geeft `{ "ok": true, "event_count": N }` of 400 bij fout.

---

## Data-model: `mining_jobs.conductus_tenant_id`

Per migratie `20260426000001_conductus_tenant_id.sql` heeft `mining_jobs` een
extra kolom:

```sql
ALTER TABLE public.mining_jobs
  ADD COLUMN conductus_tenant_id text NULL;

CREATE INDEX idx_mining_jobs_conductus_tenant
  ON public.mining_jobs(conductus_tenant_id)
  WHERE conductus_tenant_id IS NOT NULL;
```

**Belangrijk:**

- Dit is een **label**, geen toegangscontrole. RLS op `mining_jobs` blijft
  gebaseerd op `user_id` (zie `20260314000001_rls_tenant_isolation.sql`).
- Conductus mag de retroductus-DB **niet** rechtstreeks queryen. Resultaten
  moeten via een proxy-route (Fase 8) worden opgehaald.

---

## Conductus-zijde — wat Concordius bouwt

### Fase 1 — DB-migratie in `cmmn-portal`

Nieuw `supabase/migrations/NNN_process_mining_flag.sql`:

```sql
ALTER TABLE tenants
  ADD COLUMN process_mining_enabled BOOLEAN DEFAULT false;
```

(Geen `process_mining_stripe_subscription_id` — die komt pas in Fase 3 als
Stripe wordt aangesloten.)

### Fase 3 — `src/lib/features.ts`

Server-side helper die `tenants.process_mining_enabled` leest voor de huidige
gebruiker. Cache binnen één request acceptabel; geen client-side cache.

### Fase 4 — Sidebar

`SidebarWrapper.tsx` (Server Component) leest `getTenantFeatures()` en geeft
`processMiningEnabled` als prop door aan `Sidebar.tsx`. Conditioneel nav-item
"Process Mining" → `/dashboard/mining`.

### Fase 6 — Admin-toggle (handmatig)

`/dashboard/settings/admin/page.tsx` — toggle voor `process_mining_enabled` per
tenant. Alleen voor `role = 'owner'` (RBAC-check via `requireRole`). API-route
`/api/admin/features/mining/route.ts`:

```ts
export async function POST(req: Request) {
  const supabase = await createClient()
  await requireRole(supabase, ['owner'])

  const { enabled } = await req.json()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: tu } = await supabase
    .from('tenant_users')
    .select('tenant_id')
    .eq('user_id', user!.id)
    .single()

  await supabase
    .from('tenants')
    .update({ process_mining_enabled: enabled })
    .eq('id', tu!.tenant_id)

  return Response.json({ ok: true })
}
```

Geen Stripe-webhook in deze fase — Legatus (Pieter) flipt de toggle handmatig
voor interne testers.

### Fase 8 — Conductus proxy-route + Mining UI

`/api/mining/jobs/route.ts` in `cmmn-portal` proxyt naar de retroductus-engine
en stuurt **altijd** de `X-Tenant-Id` header met de Conductus-tenant-id mee:

```ts
const features = await getTenantFeatures()
if (!features?.processMining) {
  return Response.json({ error: 'Process mining is niet geactiveerd' }, { status: 403 })
}

// Haal flowable db_url op voor deze tenant (uit cmmn-portal config-tabel)
// + tenant_id van de Conductus-tenant.
const conductusTenantId: string = tu!.tenant_id

const engineResponse = await fetch(`${process.env.MINING_ENGINE_URL}/connectors/flowable/sync`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.MINING_ENGINE_SECRET}`,
    'Content-Type': 'application/json',
    'X-Tenant-Id': conductusTenantId,
    'CF-Access-Client-Id': process.env.CF_ACCESS_CLIENT_ID!,
    'CF-Access-Client-Secret': process.env.CF_ACCESS_CLIENT_SECRET!,
  },
  body: JSON.stringify({
    job_id: newJob.id,
    tenant_id: user.id,
    flowable_tenant_id: conductusTenantId,
    db_url: flowableDbUrl,
  }),
})
```

Mining-UI (`/dashboard/mining/[jobId]/page.tsx`) haalt resultaat op via een
**read-only proxy** in `cmmn-portal` die op zijn beurt via service-role-key
uit de retroductus-Supabase leest. Concordius beslist: directe service-role
read of dedicated read-endpoint op de engine. Bij directe read: alleen jobs
filteren op `conductus_tenant_id = <huidige tenant>`.

---

## Wat NIET nu

- Stripe checkout-route, webhook, billing-UI, add-on Price ID.
- Automatische tenant-flip bij betaling.
- Cross-tenant data sharing tussen Conductus en Retroductus buiten het
  vastgelegde contract.

Stripe-aanpak komt terug bij Fase 3 (publieke beta) — vermoedelijk Q3/Q4 2026.
Concordius houdt code-haakjes uit het oude plan (`ADDONS`, billing-section)
beschikbaar maar **niet** gewired.

---

## Referenties

- Engine code: `engine/routers/connectors.py` (Retroductus repo)
- Frontend proxy: `src/app/api/flowable-sync/route.ts` (Retroductus repo)
- Vibe-test: `tests/vibe/fase2-04-flowable-tenant.test.ts`
- Migratie: `supabase/migrations/20260426000001_conductus_tenant_id.sql`
- ADR (komt nog, indien afwijkingen ontstaan): `docs/adr/`
