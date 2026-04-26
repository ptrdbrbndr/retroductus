import { test, expect } from '../../testing/vibe-core/base.fixture'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import { randomUUID } from 'crypto'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_USER_EMAIL = process.env.VIBE_TEST_USER || 'pieter@debrabander.com'

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
  // BLOKKER (Ordo 8 retry, 2026-04-26): zelfde auth-cookie-rotation issue
  // als fase2-04. POST naar `/api/insights` geeft 401 ondanks geldige
  // page-context cookies; SSR-helper roteert de cookie en de geroteerde
  // versie wordt door Beelink-Supabase /auth/v1/user afgekeurd
  // (session_not_found, 403). Vereist SSR cookie-flow diagnose.
  test.fixme(
    '/api/insights levert eerste SSE-chunk binnen 3.5s tegen echte Anthropic-key',
    async ({ vibePage }) => {
      const admin = adminClient()
      const userId = await findTestUserId(admin)
      const jobId = randomUUID()

      await seedDoneJob(admin, userId, jobId)

      try {
        await vibePage.goto('/app')
        await vibePage.waitForLoadState('networkidle')

        const startedAt = Date.now()
        const result = await vibePage.evaluate(
          async ({ jid }) => {
            const r = await fetch('/api/insights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ job_id: jid, force_refresh: true }),
            })
            const ct = r.headers.get('content-type') || ''
            const text = await r.text()
            return { status: r.status, contentType: ct, text }
          },
          { jid: jobId },
        )
        const firstChunkAt = Date.now() - startedAt

        expect(result.status, 'engine moet 200 streamen, geen 5xx').toBe(200)
        expect(result.contentType).toContain('text/event-stream')

        const firstFrame = result.text.split('\n\n').find(f => f.startsWith('data: '))

        expect(firstFrame, 'eerste SSE-frame moet bestaan').toBeTruthy()
        expect(firstChunkAt).toBeLessThan(FIRST_CHUNK_BUDGET_MS)

        // Geen interne stack-trace lekken in de body (OWASP ASVS L1).
        expect(result.text).not.toContain('Traceback')
        expect(result.text).not.toMatch(/at .*\.py:\d+/)

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
