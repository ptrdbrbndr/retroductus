# Stappenplan: PM4Py integratie in Conductus

**Datum:** 2026-03-14
**Status:** Gereed voor implementatie

Dit plan is concreet en bestandsgericht — elk onderdeel verwijst naar exacte bestanden in de Conductus codebase (`cmmn-portal/`).

---

## Overzicht van wat er gebouwd wordt

```
Feature toggle (admin):  tenants.process_mining_enabled (boolean)
Add-on product:          Stripe Add-on €15/mnd (los van het basisplan)
Sidebar:                 Conditioneel nav-item "Process Mining"
Engine:                  Python FastAPI microservice op Railway
UI pagina's:             /dashboard/mining/* (Next.js)
DB migratie:             014_process_mining.sql
```

---

## Fase 1: Database — feature flag + add-on

**Nieuw bestand:** `supabase/migrations/014_process_mining.sql`

```sql
-- Feature flag op tenant-niveau
ALTER TABLE tenants
  ADD COLUMN process_mining_enabled BOOLEAN DEFAULT false,
  ADD COLUMN process_mining_stripe_subscription_id TEXT UNIQUE;

-- Plan limits uitbreiden met process mining
ALTER TABLE plan_limits
  ADD COLUMN process_mining_enabled BOOLEAN DEFAULT false;

-- Business en enterprise krijgen het gratis ingebouwd
UPDATE plan_limits
  SET process_mining_enabled = true
  WHERE plan IN ('business', 'enterprise');

-- RLS: tenants-policy al aanwezig, geen extra beleid nodig
-- tenants.process_mining_enabled is leesbaar via de bestaande "Users can view own tenants" policy
```

**Pas ook aan:** `plan_limits` seed in `supabase/seed.sql` — voeg kolom toe aan INSERT statements.

---

## Fase 2: Stripe add-on product

### 2a. Stripe dashboard (handmatig, eenmalig)
- Maak nieuw Product aan: **"Process Mining Add-on"**
- Prijs: **€15,00 / maand**, recurring
- Kopieer de `price_xxx` ID

### 2b. Omgevingsvariabelen

Voeg toe in `.env.local` (en Railway + Vercel secrets):

```
STRIPE_MINING_ADDON_PRICE_ID=price_xxx
MINING_ENGINE_URL=https://api.retroductor.nl
MINING_ENGINE_SECRET=<genereer veilig secret>
```

### 2c. Plans uitbreiden

**Bestand:** `src/lib/stripe/plans.ts`

Voeg toe naast de bestaande plan-definities:

```ts
export const ADDONS = {
  processMining: {
    name: 'Process Mining Add-on',
    price: 1500, // cents
    stripePriceId: process.env.STRIPE_MINING_ADDON_PRICE_ID || null,
    description: 'Process discovery, conformance checking en AI insights op je case-data.',
  },
} as const

export type AddonId = keyof typeof ADDONS
```

### 2d. Stripe checkout uitbreiden

**Bestand:** `src/app/api/stripe/checkout/route.ts`

Voeg handler toe voor add-on checkout (naast bestaande plan checkout). De webhook zet `process_mining_enabled = true` bij succesvolle betaling.

### 2e. Stripe webhook uitbreiden

**Bestand:** `src/app/api/stripe/webhook/route.ts`

Voeg toe in de `customer.subscription.created` / `customer.subscription.deleted` handlers:

```ts
// Bij activatie add-on
if (priceId === process.env.STRIPE_MINING_ADDON_PRICE_ID) {
  await supabase
    .from('tenants')
    .update({
      process_mining_enabled: true,
      process_mining_stripe_subscription_id: subscription.id,
    })
    .eq('stripe_customer_id', customerId)
}

// Bij opzegging add-on
if (priceId === process.env.STRIPE_MINING_ADDON_PRICE_ID) {
  await supabase
    .from('tenants')
    .update({
      process_mining_enabled: false,
      process_mining_stripe_subscription_id: null,
    })
    .eq('stripe_customer_id', customerId)
}
```

---

## Fase 3: Feature-check utility

**Nieuw bestand:** `src/lib/features.ts`

```ts
import { createClient } from '@/lib/supabase/server'

export async function getTenantFeatures() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('tenant_users')
    .select(`
      tenants (
        plan,
        process_mining_enabled
      )
    `)
    .eq('user_id', user.id)
    .single()

  const tenant = data?.tenants as { plan: string; process_mining_enabled: boolean } | null

  return {
    plan: tenant?.plan ?? 'free',
    processMining: tenant?.process_mining_enabled ?? false,
  }
}
```

---

## Fase 4: Sidebar — conditioneel nav-item

**Bestand:** `src/components/layout/Sidebar.tsx`

De Sidebar is een client component. Verander de statische `navItems` array naar een aanpak waarbij process mining conditioneel getoond wordt.

### Aanpak: server wrapper

Maak de Sidebar een server component die de feature flag leest en een prop doorgeeft:

**Nieuw bestand:** `src/components/layout/SidebarWrapper.tsx` (Server Component)

```tsx
import { getTenantFeatures } from '@/lib/features'
import { Sidebar } from './Sidebar'

export async function SidebarWrapper() {
  const features = await getTenantFeatures()
  return <Sidebar processMiningEnabled={features?.processMining ?? false} />
}
```

**Aanpassen:** `src/components/layout/Sidebar.tsx`

- Voeg prop `processMiningEnabled: boolean` toe
- Voeg conditioneel nav-item toe:

```tsx
// In navItems of als apart blok onder de bestaande items:
...(processMiningEnabled
  ? [{ href: '/dashboard/mining', label: 'Process Mining', icon: GitBranch }]
  : [])
```

Import `GitBranch` uit lucide-react.

**Aanpassen:** `src/app/dashboard/layout.tsx`

Vervang `<Sidebar />` door `<SidebarWrapper />` (Server Component aanroep).

---

## Fase 5: Billing pagina — add-on sectie

**Bestand:** `src/app/dashboard/billing/page.tsx`

Voeg sectie toe onder de bestaande plan cards:

```tsx
{/* Process Mining Add-on */}
<div className="bg-white rounded-lg shadow-sm p-6 mt-6">
  <div className="flex items-center gap-2 mb-4">
    <GitBranch className="h-5 w-5 text-blue-600" />
    <h2 className="text-lg font-semibold">Process Mining Add-on</h2>
    {tenant?.process_mining_enabled && (
      <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
        Actief
      </span>
    )}
  </div>
  <p className="text-sm text-gray-600 mb-4">
    Ontdek hoe je processen werkelijk verlopen. Process discovery,
    conformance checking en AI-inzichten op basis van je Flowable case-data.
  </p>
  <p className="text-2xl font-bold mb-4">
    €15,00<span className="text-sm font-normal text-gray-500">/mnd</span>
  </p>
  {tenant?.process_mining_enabled ? (
    <button
      data-testid="addon-mining-cancel"
      onClick={() => handleCancelAddon('processMining')}
      className="text-sm text-red-600 hover:underline"
    >
      Add-on opzeggen
    </button>
  ) : (
    <button
      data-testid="addon-mining-activate"
      onClick={() => handleActivateAddon('processMining')}
      disabled={loading === 'mining-addon'}
      className="py-2 px-4 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {loading === 'mining-addon' ? 'Bezig...' : 'Inschakelen'}
    </button>
  )}
</div>
```

Voeg `handleActivateAddon` en `handleCancelAddon` functies toe die `POST /api/stripe/checkout` aanroepen met `{ addonId: 'processMining' }`.

---

## Fase 6: Admin-dashboard — feature toggle

**Nieuw bestand:** `src/app/dashboard/settings/admin/page.tsx`

> Alleen zichtbaar voor tenants met `role = 'owner'`. Bevat de handmatige override voor process mining (handig voor trials, gratis activatie voor testklanten).

```tsx
'use client'
// Formulier met toggle: "Process Mining inschakelen (handmatig)"
// POST /api/admin/features/mining
// Alleen voor owners, RBAC check via src/lib/rbac.ts
```

**Nieuw bestand:** `src/app/api/admin/features/mining/route.ts`

```ts
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/rbac'

export async function POST(req: Request) {
  const supabase = await createClient()
  await requireRole(supabase, ['owner']) // gooit 403 als niet owner

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

**Sidebar:** voeg "Admin" item toe (conditioneel op role = 'owner'):

```tsx
{ href: '/dashboard/settings/admin', label: 'Admin', icon: ShieldCheck }
```

---

## Fase 7: Mining Engine — Python FastAPI service

**Nieuwe repo/map:** `retroductus/engine/` (apart van cmmn-portal)

### Structuur

```
engine/
  main.py               FastAPI app entry point
  requirements.txt      pm4py, fastapi, uvicorn, python-dotenv
  Dockerfile
  railway.toml
  routers/
    logs.py             POST /logs — upload event log
    analysis.py         POST /analysis/discover, /performance
    insights.py         POST /insights/ai
  services/
    flowable.py         Flowable PostgreSQL connector
    mining.py           PM4Py wrapper functies
    ai.py               Claude API integratie
  models/
    schemas.py          Pydantic request/response models
```

### Flowable-connector

`services/flowable.py` leest direct uit de Flowable `ACT_HI_ACTINST` tabel:

```python
import pandas as pd
import psycopg2

def extract_event_log(flowable_db_url: str, tenant_id: str) -> pd.DataFrame:
    conn = psycopg2.connect(flowable_db_url)
    query = """
        SELECT
            proc_inst_id_ AS case_id,
            act_name_     AS activity,
            start_time_   AS timestamp,
            end_time_     AS complete_time,
            assignee_     AS resource
        FROM act_hi_actinst
        WHERE tenant_id_ = %s
        ORDER BY start_time_
    """
    df = pd.read_sql(query, conn, params=(tenant_id,))
    conn.close()
    return df
```

### Authenticatie

Engine valideert requests via een gedeeld secret (`MINING_ENGINE_SECRET`) in de `Authorization: Bearer` header. Conductus stuurt dit secret mee vanuit server-side API routes — nooit blootgesteld aan de browser.

### Deployment

```toml
# engine/railway.toml
[build]
builder = "dockerfile"

[deploy]
startCommand = "uvicorn main:app --host 0.0.0.0 --port $PORT"
```

---

## Fase 8: Process Mining UI in Conductus

### Pagina's (Next.js App Router)

**Nieuwe bestanden:**

```
src/app/dashboard/mining/
  page.tsx              Overzicht — project kiezen of Flowable koppelen
  [jobId]/
    page.tsx            Tabbladen: Discovery / Performance / AI Insights
```

### `src/app/dashboard/mining/page.tsx`

- Check `process_mining_enabled` — toon upgrade-prompt als `false`
- Knop "Analyseer mijn Flowable data" → `POST /api/mining/jobs` (start job)
- Lijst van eerdere analyses

### `src/app/dashboard/mining/[jobId]/page.tsx`

- Tabs: Discovery | Performance | AI Insights
- Discovery: DFG visualisatie (JSON → SVG via Mining Engine, gerenderd als `<img>`)
- Performance: doorlooptijden tabel + histogram
- AI Insights: gestreamde Claude-output

### Nieuwe API route

**`src/app/api/mining/jobs/route.ts`** — proxyt naar Mining Engine:

```ts
export async function POST(req: Request) {
  // 1. Check feature flag
  const features = await getTenantFeatures()
  if (!features?.processMining) {
    return Response.json({ error: 'Upgrade vereist' }, { status: 403 })
  }

  // 2. Haal Flowable credentials op voor deze tenant
  // 3. POST naar MINING_ENGINE_URL/analysis/discover
  // 4. Sla job metadata op in Supabase
  // 5. Return job ID
}
```

---

## Fase 9: Vibe-tests

**Nieuwe testbestanden in `tests/vibe/`:**

### `19-mining-gate.test.ts`
Test dat een Free/Pro gebruiker de Mining pagina ziet met upgrade-prompt (feature toggle uit).

```ts
import { test, expect } from '../../testing/vibe-core/base.fixture'

test('mining shows upgrade prompt when disabled', async ({ page }) => {
  await page.goto('/dashboard/mining')
  await page.vibeCheck('mining-gate-upgrade-prompt')
  await expect(page.getByTestId('mining-upgrade-prompt')).toBeVisible()
})
```

### `20-mining-activate.test.ts`
Test dat een Business-gebruiker (of toggle aan) de Mining pagina bereikt en een job kan starten.

```ts
test('mining page loads for enabled tenant', async ({ page }) => {
  await page.goto('/dashboard/mining')
  await page.vibeCheck('mining-dashboard-loaded')
  await expect(page.getByTestId('mining-start-job')).toBeVisible()
})
```

### `21-billing-addon.test.ts`
Test dat de add-on sectie zichtbaar is op de billing pagina.

```ts
test('process mining addon visible on billing page', async ({ page }) => {
  await page.goto('/dashboard/billing')
  await page.vibeCheck('billing-addon-section')
  await expect(page.getByTestId('addon-mining-activate')).toBeVisible()
})
```

---

## Volgorde van implementatie

| Stap | Bestand(en) | Afhankelijkheid |
|------|------------|-----------------|
| 1 | `014_process_mining.sql` | — |
| 2 | `.env.local` + Stripe dashboard | Stap 1 |
| 3 | `src/lib/stripe/plans.ts` — ADDONS | Stap 2 |
| 4 | `src/lib/features.ts` | Stap 1 |
| 5 | `src/app/api/stripe/checkout/route.ts` | Stap 3 |
| 6 | `src/app/api/stripe/webhook/route.ts` | Stap 3 |
| 7 | `src/components/layout/SidebarWrapper.tsx` | Stap 4 |
| 8 | `src/components/layout/Sidebar.tsx` (prop toevoegen) | Stap 7 |
| 9 | `src/app/dashboard/layout.tsx` (SidebarWrapper) | Stap 7 |
| 10 | `src/app/dashboard/billing/page.tsx` (addon sectie) | Stap 3, 4 |
| 11 | `src/app/api/admin/features/mining/route.ts` | Stap 1, 4 |
| 12 | `src/app/dashboard/settings/admin/page.tsx` | Stap 11 |
| 13 | Mining Engine — `engine/` map bouwen + deployen | — |
| 14 | `src/app/api/mining/jobs/route.ts` | Stap 4, 13 |
| 15 | `src/app/dashboard/mining/page.tsx` | Stap 14 |
| 16 | `src/app/dashboard/mining/[jobId]/page.tsx` | Stap 15 |
| 17 | Vibe-tests 19, 20, 21 | Alle bovenstaande |
| 18 | `./vibe-check.sh` — 0 fouten | Stap 17 |

---

## Definition of Done

- [ ] Migratie `014` succesvol toegepast op staging Supabase
- [ ] `process_mining_enabled = false` is de default — geen bestaande tenant raakt iets
- [ ] Billing pagina toont add-on sectie met werkende Stripe checkout
- [ ] Admin toggle werkt (owner kan handmatig inschakelen)
- [ ] Sidebar toont "Process Mining" alleen als toggle aan
- [ ] `/dashboard/mining` toont upgrade-prompt als toggle uit
- [ ] Mining Engine draait op Railway en is bereikbaar via `api.retroductor.nl`
- [ ] Flowable-connector haalt event log op uit staging Flowable DB
- [ ] `./vibe-check.sh` — 0 fouten, 0 console errors
- [ ] Geen hardcoded secrets of credentials in code
