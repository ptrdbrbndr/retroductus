# Stappenplan UI — Retroductus Analyse-applicatie

**Versie:** 1.0
**Datum:** 2026-03-16
**Focus:** Bouwen van de applicatie-UI (engine is 100% klaar)

---

## Huidige staat

| Onderdeel | Status |
|-----------|--------|
| Mining Engine (FastAPI + PM4Py) | ✅ Compleet |
| Landingspagina (`ui/src/app/page.tsx`) | ✅ Compleet |
| Security hardening (auth, RLS, rate limiting) | ✅ Compleet (STAPPENPLAN.md) |
| Railway + Vercel + DNS | ✅ Geconfigureerd |
| App-pagina's (login, dashboard, upload, results) | ❌ Ontbreekt volledig |
| Supabase/xyflow/recharts packages in UI | ❌ Niet geïnstalleerd |
| Vibe-tests | ❌ Ontbreekt |

**Enige taak:** de Next.js app-pagina's bouwen die de engine aansturen.

---

## Architectuurafspraken (voor je begint)

- **Auth:** Conductus Supabase (`dpybzmujozzwqbqusekc.supabase.co`) — gedeeld met Conductus
- **Engine-calls:** altijd via Next.js API routes — nooit direct vanuit de browser
- **Mining Engine secret** gaat nooit naar de client
- **Polling strategie:** `GET /results/{job_id}` elke 2s, stop na `status === 'done' | 'error'`
- **Supabase tabel:** `mining_jobs` (kolommen: `id`, `user_id`, `status`, `result`, `event_count`, `error_message`, `insights_cache`, `completed_at`)

---

## Stap 1 — Packages installeren

**Werkmap:** `c:\Projecten\retroductus\ui\`

```bash
npm install @supabase/supabase-js @supabase/ssr @xyflow/react recharts
```

Voeg toe aan `package.json` dependencies:
- `@supabase/supabase-js` — Supabase client
- `@supabase/ssr` — server-side sessies in Next.js App Router
- `@xyflow/react` — DFG-visualisatie (interactieve graaf)
- `recharts` — histogrammen en doorlooptijden-charts

**Definition of Done:** `npm run build` slaagt.

---

## Stap 2 — Supabase client + middleware

### 2a. Environment variables

Maak `ui/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://dpybzmujozzwqbqusekc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<zie credentials memory>
MINING_ENGINE_URL=https://api.retroductor.nl
MINING_ENGINE_SECRET=VM8ZWRdkO1MVYDfxGBbYnBKFps2wa_7RH4n9fMC_2WY
```

Voeg ook toe aan Vercel project secrets (productie).

### 2b. Supabase client helpers

**`src/lib/supabase/client.ts`** — browser client:
```typescript
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

**`src/lib/supabase/server.ts`** — server component client:
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  )
}
```

### 2c. Middleware (sessiebeheer)

**`src/middleware.ts`:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: (c) => c.forEach(({ name, value, options }) => response.cookies.set(name, value, options)) } }
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Beschermde routes: redirect naar login als niet ingelogd
  if (!user && request.nextUrl.pathname.startsWith('/app')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  // Ingelogd op login/register → redirect naar app
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/register')) {
    return NextResponse.redirect(new URL('/app', request.url))
  }
  return response
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
```

**Definition of Done:** `npm run build` slaagt, `/app` redirectt naar `/login` zonder sessie.

---

## Stap 3 — Auth pagina's

### 3a. Login

**`src/app/login/page.tsx`** — loginformulier:

- Velden: e-mailadres, wachtwoord
- Foutmelding in Nederlands bij mislukte login
- Link naar registratie
- Na login: redirect naar `/app`

Kernlogica:
```typescript
const supabase = createClient()
const { error } = await supabase.auth.signInWithPassword({ email, password })
if (error) setFout('E-mailadres of wachtwoord onjuist.')
else router.push('/app')
```

**data-testid:** `login-email`, `login-password`, `login-submit`, `login-error`

### 3b. Registratie

**`src/app/register/page.tsx`** — registratieformulier:

- Velden: e-mailadres, wachtwoord (min. 8 tekens), wachtwoord bevestigen
- Na registratie: toon bevestigingsbericht "Controleer je e-mail"

**data-testid:** `register-email`, `register-password`, `register-password-confirm`, `register-submit`, `register-confirm-message`

### 3c. Layout

**`src/app/login/layout.tsx`** en **`src/app/register/layout.tsx`** — gecentreerde kaart op wit/stone achtergrond, Retroductus logo bovenaan.

**Definition of Done:** inloggen met `testuser@conductus.nl` / `Conductus-Test-2026!` werkt en leidt naar `/app`.

---

## Stap 4 — App layout (beschermde routes)

**`src/app/app/layout.tsx`** — server component:
- Leest gebruiker via Supabase server client
- Rendert `<Sidebar>` + `{children}`

**`src/components/layout/Sidebar.tsx`** — navigatie:
- Logo + naam "Retroductus"
- Nav-items: Dashboard (`/app`), Analyses (`/app/analyses`), Instellingen (`/app/settings`)
- Uitloggen-knop onderaan
- Responsive: collapseerbaar op mobiel

**`src/components/layout/Sidebar.tsx` uitloggen:**
```typescript
const supabase = createClient()
await supabase.auth.signOut()
router.push('/login')
```

**data-testid:** `sidebar`, `nav-dashboard`, `nav-analyses`, `nav-settings`, `btn-logout`

**Definition of Done:** ingelogd gebruiker ziet sidebar na `/app`, uitloggen werkt.

---

## Stap 5 — Dashboard (job-overzicht + upload)

**`src/app/app/page.tsx`** — dashboard:

### 5a. Bestaande jobs ophalen

Haal `mining_jobs` op via Supabase client (gefilterd op `user_id = auth.uid()`):

```typescript
const { data: jobs } = await supabase
  .from('mining_jobs')
  .select('id, status, event_count, completed_at, error_message')
  .eq('user_id', user.id)
  .order('created_at', { ascending: false })
  .limit(20)
```

### 5b. Job-lijst weergave

Tabel/kaarten met kolommen:
- Status badge: `pending` (grijs), `running` (blauw, pulserend), `done` (groen), `error` (rood)
- Event count
- Datum/tijd
- Actie-link "Bekijk resultaten" → `/app/analyses/{job_id}`

### 5c. Upload-sectie

Upload zone bovenaan (of aparte knop "Nieuwe analyse"):
- Drag-and-drop of klik om te uploaden
- Accepteert `.csv` en `.xes`
- Na selectie: toon bestandsnaam + geschat aantal rijen (CSV: snel tellen)
- Knop "Start analyse"

**API route `src/app/api/upload/route.ts`:**
```typescript
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File

  // Doorsturen naar Mining Engine
  const engineForm = new FormData()
  engineForm.append('file', file)
  engineForm.append('tenant_id', user.id)

  const resp = await fetch(`${process.env.MINING_ENGINE_URL}/logs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.MINING_ENGINE_SECRET}` },
    body: engineForm,
  })

  if (!resp.ok) {
    const err = await resp.json()
    return Response.json({ error: err.detail || 'Upload mislukt' }, { status: resp.status })
  }

  return Response.json(await resp.json())
}
```

**data-testid:** `upload-dropzone`, `upload-filename`, `upload-submit`, `upload-loading`, `job-table`, `job-row`, `job-status-badge`, `job-view-link`

**Definition of Done:** CSV uploaden start een job, job verschijnt in de lijst met status `pending` → `running` → `done`.

---

## Stap 6 — Analyse-resultaten pagina (shell + polling)

**`src/app/app/analyses/[jobId]/page.tsx`** — client component:

### 6a. Job-status polling

```typescript
const [job, setJob] = useState<Job | null>(null)

useEffect(() => {
  const poll = async () => {
    const resp = await fetch(`/api/jobs/${jobId}`)
    const data = await resp.json()
    setJob(data)
    if (data.status !== 'done' && data.status !== 'error') {
      setTimeout(poll, 2000)
    }
  }
  poll()
}, [jobId])
```

**API route `src/app/api/jobs/[jobId]/route.ts`:**
```typescript
export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { data } = await supabase
    .from('mining_jobs')
    .select('*')
    .eq('id', params.jobId)
    .eq('user_id', user.id)  // RLS extra check
    .single()

  if (!data) return Response.json({ error: 'Niet gevonden' }, { status: 404 })
  return Response.json(data)
}
```

### 6b. Tabbladstructuur

Vier tabs (alleen zichtbaar als `status === 'done'`):
- **Procesmodel** — DFG-visualisatie
- **Performance** — doorlooptijden + bottlenecks
- **Varianten** — trace-varianten tabel
- **AI Inzichten** — Claude streaming

Tijdens `running`: laadscherm met spinner en "Analyse wordt uitgevoerd... (gemiddeld 30 seconden)"
Bij `error`: foutmelding uit `error_message`

**data-testid:** `job-loading`, `job-error`, `tab-procesmodel`, `tab-performance`, `tab-varianten`, `tab-insights`

---

## Stap 7 — DFG-visualisatie (Procesmodel tab)

**`src/components/mining/DFGGraph.tsx`** — React Flow component:

### Input

```typescript
interface DFGGraphProps {
  nodes: { activity: string; count: number; avg_duration_sec: number | null }[]
  edges: { from: string; to: string; count: number; avg_duration_sec: number | null }[]
  startActivities: Record<string, number>
  endActivities: Record<string, number>
}
```

### Node layout

Gebruik `elkjs` of handmatige positionering (links-naar-rechts):
- Start-activiteiten (in `startActivities`): groen border
- Eind-activiteiten (in `endActivities`): rood border
- Node-label: activiteitnaam + `(NNx)` + gem. duur als beschikbaar

```typescript
const rfNodes: Node[] = nodes.map((n, i) => ({
  id: n.activity,
  type: 'default',
  data: {
    label: (
      <div className="text-xs text-center">
        <div className="font-medium">{n.activity}</div>
        <div className="text-gray-400">{n.count}x</div>
        {n.avg_duration_sec && <div className="text-blue-500">{formatDuration(n.avg_duration_sec)}</div>}
      </div>
    )
  },
  position: { x: (i % 4) * 220, y: Math.floor(i / 4) * 120 },
  style: {
    background: startActivities[n.activity] ? '#d1fae5' : endActivities[n.activity] ? '#fee2e2' : '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: 8,
    minWidth: 140,
  }
}))
```

### Edge styling

Dikte proportioneel aan frequentie (1–8px), kleur op basis van gem. duur (groen → oranje → rood):

```typescript
const maxCount = Math.max(...edges.map(e => e.count), 1)
const rfEdges: Edge[] = edges.map(e => ({
  id: `${e.from}-${e.to}`,
  source: e.from,
  target: e.to,
  label: e.avg_duration_sec ? formatDuration(e.avg_duration_sec) : String(e.count),
  style: {
    strokeWidth: Math.max(1, Math.round((e.count / maxCount) * 8)),
    stroke: durationColor(e.avg_duration_sec),
  },
  animated: false,
}))
```

### Hulpfunctie duurformattering

```typescript
const formatDuration = (sec: number): string => {
  if (sec < 60) return `${Math.round(sec)}s`
  if (sec < 3600) return `${Math.round(sec / 60)}min`
  if (sec < 86400) return `${(sec / 3600).toFixed(1)}u`
  return `${(sec / 86400).toFixed(1)}d`
}
```

### Weergave in tab

```tsx
<div style={{ height: 500 }}>
  <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
    <Background />
    <Controls />
    <MiniMap />
  </ReactFlow>
</div>
```

**data-testid:** `dfg-canvas`, `dfg-controls`

**Definition of Done:** na succesvolle analyse toont de DFG-tab een interactieve graaf met nodes en edges.

---

## Stap 8 — Performance tab

**`src/components/mining/PerformanceTab.tsx`**

### 8a. Doorlooptijd-statistieken (bovenaan)

Vier stat-kaarten naast elkaar:
- Gemiddeld: `case_durations.avg_sec`
- Mediaan (P50): `case_durations.p50_sec`
- P95: `case_durations.p95_sec`
- Aantal cases: `case_durations.case_count`

```typescript
// Data komt uit job.result.case_durations
const { avg_sec, p50_sec, p95_sec, case_count, histogram } = result.case_durations ?? {}
```

### 8b. Histogram (Recharts BarChart)

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

<ResponsiveContainer width="100%" height={200}>
  <BarChart data={histogram}>
    <XAxis dataKey="bucket_label" tick={{ fontSize: 11 }} />
    <YAxis />
    <Tooltip />
    <Bar dataKey="count" fill="#2EC4B6" radius={[3, 3, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

### 8c. Activiteiten-tabel (bottlenecks)

Tabel gesorteerd op `avg_duration_sec` descending:

| Activiteit | Frequentie | Gem. duur |
|------------|-----------|-----------|

```typescript
// Data: job.result.performance
const perfData = result.performance ?? []
const sorted = [...perfData].sort((a, b) => (b.avg_duration_sec ?? 0) - (a.avg_duration_sec ?? 0))
```

**data-testid:** `perf-avg`, `perf-p50`, `perf-p95`, `perf-histogram`, `perf-activity-table`

---

## Stap 9 — Varianten tab

**`src/components/mining/VariantenTab.tsx`**

Tabel van `result.trace_variants`:

| # | Pad | Cases | % | Gem. duur |
|---|-----|-------|---|-----------|

- **Pad**: activiteiten als chips naast elkaar (→ pijl ertussen)
- Klikken op rij: highlight die variant in de DFG (toekomstige uitbreiding — nu alleen expand)

```typescript
// Data: job.result.trace_variants
interface TraceVariant {
  variant_id: number
  activities: string[]
  case_count: number
  percentage: number
  avg_duration_sec: number | null
}
```

**data-testid:** `varianten-table`, `variant-row`

---

## Stap 10 — AI Inzichten tab

**`src/components/mining/InsightsTab.tsx`** — client component met streaming

### 10a. API route (SSE proxy)

**`src/app/api/insights/[jobId]/route.ts`:**
```typescript
export async function GET(_: Request, { params }: { params: { jobId: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Ownership check
  const { data: job } = await supabase
    .from('mining_jobs')
    .select('id')
    .eq('id', params.jobId)
    .eq('user_id', user.id)
    .single()
  if (!job) return Response.json({ error: 'Niet gevonden' }, { status: 404 })

  // Proxy SSE naar engine
  const engineResp = await fetch(`${process.env.MINING_ENGINE_URL}/insights/ai`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.MINING_ENGINE_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ job_id: params.jobId }),
  })

  return new Response(engineResp.body, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

### 10b. Streaming UI component

```typescript
const [tekst, setTekst] = useState('')
const [laden, setLaden] = useState(false)

const laadInsights = async () => {
  setLaden(true)
  setTekst('')
  const resp = await fetch(`/api/insights/${jobId}`)
  const reader = resp.body!.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) setTekst(prev => prev + data.text)
          if (data.done) setLaden(false)
        } catch { /* lege regel */ }
      }
    }
  }
}
```

**Weergave:**
- Knop "Genereer inzichten" (eerste keer)
- Markdown-achtige rendering van de tekst (bold headers via regex of `react-markdown`)
- Laadtekst: "Claude analyseert je proces..."

**data-testid:** `insights-generate-btn`, `insights-text`, `insights-loading`

---

## Stap 11 — Vibe-tests

**Locatie:** `tests/vibe/` (in de repo root, naast `ui/` en `engine/`)

Stel eerst in `.env` in:
```env
VIBE_BASE_URL=http://localhost:3001
```

### Test 1: `01-auth-login.test.ts`
```typescript
import { test, expect } from '../../testing/vibe-core/base.fixture'

test('login werkt met testaccount', async ({ page }) => {
  await page.goto('/login')
  await page.getByTestId('login-email').fill('testuser@conductus.nl')
  await page.getByTestId('login-password').fill('Conductus-Test-2026!')
  await page.getByTestId('login-submit').click()
  await page.vibeCheck('login-success')
  await expect(page).toHaveURL('/app')
})
```

### Test 2: `02-auth-guard.test.ts`
```typescript
test('niet ingelogd redirectt naar login', async ({ page }) => {
  await page.goto('/app')
  await page.vibeCheck('auth-guard-redirect')
  await expect(page).toHaveURL('/login')
})
```

### Test 3: `03-upload-en-analyse.test.ts`
```typescript
test('CSV uploaden start een analyse', async ({ page }) => {
  // Gebruik authContext fixture voor ingelogde sessie
  await page.goto('/app')
  await page.vibeCheck('dashboard-geladen')
  await expect(page.getByTestId('upload-dropzone')).toBeVisible()

  // Upload testbestand
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByTestId('upload-dropzone').click(),
  ])
  await fileChooser.setFiles('engine/testdata/testlog.csv')

  await page.getByTestId('upload-submit').click()
  await page.vibeCheck('upload-gestart')
  await expect(page.getByTestId('job-status-badge')).toBeVisible()
})
```

### Test 4: `04-resultaten-weergave.test.ts`
```typescript
test('voltooide job toont DFG-visualisatie', async ({ page }) => {
  // Navigeer direct naar een bekende voltooide job
  await page.goto('/app/analyses/TEST_JOB_ID')
  await page.vibeCheck('resultaten-geladen')
  await expect(page.getByTestId('dfg-canvas')).toBeVisible()
  await page.getByTestId('tab-performance').click()
  await expect(page.getByTestId('perf-histogram')).toBeVisible()
})
```

### Test 5: `05-rls-isolatie.test.ts`
```typescript
test('gebruiker ziet alleen eigen jobs', async ({ page }) => {
  // Inloggen als gebruiker A, probeer job van B op te halen
  await page.goto('/app/analyses/ANDERE_GEBRUIKER_JOB_ID')
  await page.vibeCheck('rls-isolatie')
  // Moet 404 of dashboard tonen
  await expect(page.getByTestId('job-error')).toBeVisible()
})
```

**Definition of Done stap 11:** `./vibe-check.sh` — 0 fouten, 0 console errors.

---

## Stap 12 — Deploy naar staging

```bash
cd /c/Projecten/retroductus

VERCEL_TOKEN="<zie credentials memory>"
npx vercel deploy --token="$VERCEL_TOKEN" --yes

# Alias instellen:
DEPLOY_URL=$(npx vercel deploy --token="$VERCEL_TOKEN" --yes 2>&1 | grep "Preview:" | awk '{print $2}')
npx vercel alias set "$DEPLOY_URL" staging.retroductus.nl --token="$VERCEL_TOKEN" --scope=ptrdbrbndrs-projects
```

Handmatig testen op staging:
- [ ] Inloggen werkt
- [ ] CSV uploaden werkt
- [ ] DFG is zichtbaar na analyse
- [ ] AI inzichten streamen
- [ ] Uitloggen werkt

**Definition of Done stap 12:** `staging.retroductus.nl` volledig functioneel.

---

## Volgorde en tijdsinschatting

| Stap | Onderdeel | Uren |
|------|-----------|------|
| 1 | Packages installeren | 0.5u |
| 2 | Supabase client + middleware | 1u |
| 3 | Login + registratie pagina's | 2u |
| 4 | App layout + sidebar | 1.5u |
| 5 | Dashboard + upload API route | 3u |
| 6 | Resultaten-shell + polling | 2u |
| 7 | DFG-visualisatie | 3u |
| 8 | Performance tab | 2u |
| 9 | Varianten tab | 1u |
| 10 | AI inzichten streaming | 2u |
| 11 | Vibe-tests | 2u |
| 12 | Staging deploy + handmatig testen | 1u |
| **Totaal** | | **~21 uur** |

---

## Kritieke afhankelijkheden

```
Stap 1 (packages)
  └── Stap 2 (Supabase client)
        └── Stap 3 (auth pagina's)
              └── Stap 4 (app layout)
                    └── Stap 5 (dashboard + upload)
                          └── Stap 6 (resultaten shell)
                                ├── Stap 7 (DFG)      ─┐
                                ├── Stap 8 (performance)├── parallel uitvoerbaar
                                ├── Stap 9 (varianten) ─┤
                                └── Stap 10 (AI)       ─┘
                                      └── Stap 11 (vibe-tests)
                                            └── Stap 12 (deploy)
```

Stappen 7–10 zijn **parallel uitvoerbaar** zodra stap 6 klaar is.

---

## Definition of Done (geheel)

- [ ] Inloggen en uitloggen werkt via Conductus Supabase
- [ ] CSV en XES uploaden start een analyse-job
- [ ] DFG-visualisatie toont nodes, edges en doorlooptijden
- [ ] Performance tab toont histogram, statistieken en activiteitentabel
- [ ] Varianten tab toont top-20 procesvarianten
- [ ] AI inzichten streamen in de UI (Pro-account vereist)
- [ ] RLS: gebruiker ziet alleen eigen jobs
- [ ] `./vibe-check.sh` — 0 fouten, 0 console errors
- [ ] Geen hardcoded secrets
- [ ] `staging.retroductus.nl` is publiek bereikbaar

---

*Stappenplan UI Retroductus v1.0 — 2026-03-16*
