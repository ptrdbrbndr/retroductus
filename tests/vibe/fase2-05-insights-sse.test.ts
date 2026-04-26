import { test, expect } from '../../testing/vibe-core/base.fixture'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { randomUUID } from 'crypto'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_USER_EMAIL = 'test@retroductus.nl'

// SSE-eerste-chunk-budget. Engine moet binnen deze tijd het eerste
// `data: ...\n\n` frame leveren via Anthropic streaming. 3000ms is de norm
// uit het plan (Ordo 7); 500ms tolerantie voor TLS/CF Access roundtrip.
const FIRST_CHUNK_BUDGET_MS = 3500

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

function adminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Vibe-test vereist NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Minimale-maar-voldoende `mining_jobs.result` JSONB voor de insights-prompt
 * (zie engine/routers/insights.py → _build_prompt). Vorm volgt het runtime-schema
 * dat analysis.py oplevert: dfg_nodes/dfg_edges/start_activities/end_activities/
 * event_count/case_count/activity_count.
 */
function dummyMiningResult() {
  return {
    event_count: 12,
    case_count: 3,
    activity_count: 4,
    dfg_nodes: [
      { activity: 'Aanvraag ontvangen', count: 3 },
      { activity: 'Beoordeling', count: 3 },
      { activity: 'Goedkeuring', count: 2 },
      { activity: 'Afhandeling', count: 4 },
    ],
    dfg_edges: [
      { source: 'Aanvraag ontvangen', target: 'Beoordeling', count: 3 },
      { source: 'Beoordeling', target: 'Goedkeuring', count: 2 },
      { source: 'Goedkeuring', target: 'Afhandeling', count: 2 },
    ],
    start_activities: { 'Aanvraag ontvangen': 3 },
    end_activities: { Afhandeling: 2, Afwijzing: 1 },
  }
}

async function findTestUserId(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin.auth.admin.listUsers()
  if (error) throw error
  const user = data.users.find(u => u.email === TEST_USER_EMAIL)
  if (!user) throw new Error(`Test-user ${TEST_USER_EMAIL} ontbreekt in Supabase`)
  return user.id
}

async function seedDoneJob(admin: SupabaseClient, userId: string, jobId: string): Promise<void> {
  const { error } = await admin.from('mining_jobs').insert({
    id: jobId,
    user_id: userId,
    status: 'done',
    result: dummyMiningResult(),
    event_count: 12,
    filename: 'fase2-05-insights-vibe-seed.csv',
    completed_at: new Date().toISOString(),
    insights_cache: null,
  })
  if (error) throw error
}

async function deleteJob(admin: SupabaseClient, jobId: string): Promise<void> {
  await admin.from('mining_jobs').delete().eq('id', jobId)
}

test.describe('Ordo 7 — AI-insights SSE-stream eerste chunk binnen budget', () => {
  // Lokaal kunnen we deze happy-path niet draaien: Supabase Cloud-URL in .env.local
  // is uitgefaseerd (Ordo 4-rapport, fresh-start naar Beelink-Supabase achter
  // Cloudflare Access). De engine zelf zit ook achter CF Access. Canonieke validatie
  // gebeurt op staging-deploy via de rapport-curl in
  // docs/agent-log/2026-04-26-ordo-7-ai-insights-sse.md (zie §Verificatie).
  // Zelfde pragmatische aanpak als fase2-01 en fase2-04.
  test.fixme(
    '/api/insights levert eerste SSE-chunk binnen 3.5s tegen echte Anthropic-key',
    async ({ vibePage }) => {
      const admin = adminClient()
      const userId = await findTestUserId(admin)
      const jobId = randomUUID()

      await seedDoneJob(admin, userId, jobId)

      try {
        const startedAt = Date.now()
        const response = await vibePage.request.post('/api/insights', {
          headers: { 'Content-Type': 'application/json' },
          data: { job_id: jobId, force_refresh: true },
          timeout: 15000,
        })

        expect(response.status(), 'engine moet 200 streamen, geen 5xx').toBe(200)
        expect(response.headers()['content-type']).toContain('text/event-stream')

        // Lees de stream byte-voor-byte tot het eerste `data: ` frame binnen is.
        const body = await response.body()
        const firstChunkAt = Date.now() - startedAt
        const text = body.toString('utf8')
        const firstFrame = text.split('\n\n').find(f => f.startsWith('data: '))

        expect(firstFrame, 'eerste SSE-frame moet bestaan').toBeTruthy()
        expect(firstChunkAt).toBeLessThan(FIRST_CHUNK_BUDGET_MS)

        // Geen interne stack-trace lekken in de body (OWASP ASVS L1).
        expect(text).not.toContain('Traceback')
        expect(text).not.toMatch(/at .*\.py:\d+/)

        await vibePage.vibeCheck('insights-sse-first-chunk')
      } finally {
        await deleteJob(admin, jobId)
      }
    },
  )

  test('niet-ingelogde request op /api/insights wordt geweerd met 401', async ({ vibePage }) => {
    await vibePage.context().clearCookies()
    const response = await vibePage.request.post('/api/insights', {
      headers: { 'Content-Type': 'application/json' },
      data: { job_id: '00000000-0000-0000-0000-000000000000', force_refresh: true },
    })
    expect(response.status()).toBe(401)
  })
})
