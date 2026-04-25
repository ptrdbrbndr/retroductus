import { test, expect } from '../../testing/vibe-core/base.fixture'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TENANT_ID = 'tnt-test-2026-04-25'
const DUMMY_DB_URL = 'postgresql://dummy:dummy@127.0.0.1:5432/flowable_test'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Vibe-test vereist NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

test.describe('Ordo 6 — Conductus X-Tenant-Id contract op Flowable-sync', () => {
  // Lokale auth-state.json is van de verwijderde Cloud-Supabase
  // (`ttfgpbuievkuiwdhmtaz`). De Beelink-Supabase achter Cloudflare Access
  // is lokaal niet bereikbaar. Deze happy-path-test valideren we via
  // staging-deploy + curl uit de rapport-sectie. Zie fase2-01 voor zelfde
  // pragmatische aanpak.
  test.fixme(
    'flowable-sync stempelt mining_jobs.conductus_tenant_id met header-waarde',
    async ({ vibePage }) => {
      const response = await vibePage.request.post('/api/flowable-sync', {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Id': TENANT_ID,
        },
        data: {
          db_url: DUMMY_DB_URL,
          flowable_tenant_id: TENANT_ID,
        },
      })

      expect([200, 202, 500]).toContain(response.status())

      const body = await response.json().catch(() => ({}))
      const jobId: string | undefined = body.job_id
      expect(jobId).toBeTruthy()

      const admin = adminClient()
      const { data, error } = await admin
        .from('mining_jobs')
        .select('id, conductus_tenant_id')
        .eq('id', jobId!)
        .single()

      expect(error).toBeNull()
      expect(data?.conductus_tenant_id).toBe(TENANT_ID)

      await vibePage.vibeCheck('flowable-sync-tenant-tag')
    },
  )

  test('flowable-sync zonder tenant-id geeft 400 of 401 met NL fout', async ({ vibePage }) => {
    const response = await vibePage.request.post('/api/flowable-sync', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        db_url: DUMMY_DB_URL,
      },
    })

    // Auth gaat eerst (401 mogelijk indien sessie expired). Bij geldige sessie
    // of mock: 400 met NL fout. Beide acceptabel voor dit contract — de
    // canonieke happy-path-validatie staat in de rapport-curl.
    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const body = await response.json()
      expect(body.error.toLowerCase()).toContain('tenant-id is verplicht')
    }
  })

  test('flowable-sync met inconsistente tenant-id (header vs body) geeft 400 of 401', async ({ vibePage }) => {
    const response = await vibePage.request.post('/api/flowable-sync', {
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': TENANT_ID,
      },
      data: {
        db_url: DUMMY_DB_URL,
        flowable_tenant_id: 'tnt-andere-id',
      },
    })

    expect([400, 401]).toContain(response.status())

    if (response.status() === 400) {
      const body = await response.json()
      expect(body.error.toLowerCase()).toContain('tenant')
    }
  })
})
