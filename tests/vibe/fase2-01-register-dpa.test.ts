import { test, expect } from '../../testing/vibe-core/base.fixture'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function adminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Vibe-test vereist NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local')
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function uniqueEmail(): string {
  const stamp = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  return `vibe-dpa-${stamp}@retroductus.test`
}

async function cleanupUserByEmail(email: string): Promise<void> {
  const admin = adminClient()
  const { data } = await admin.auth.admin.listUsers()
  const match = data.users.find(u => u.email === email)
  if (match) {
    await admin.auth.admin.deleteUser(match.id)
  }
}

test.describe('Ordo 3 — DPA-acceptatie verplicht in register', () => {
  test('checkbox begint uitgevinkt en submit-button is disabled tot gechecked', async ({ vibePage }) => {
    await vibePage.context().clearCookies()
    await vibePage.goto('/register')
    await vibePage.waitForLoadState('networkidle')

    const checkbox = vibePage.getByTestId('register-dpa-checkbox')
    const submit = vibePage.getByTestId('register-submit')

    await expect(checkbox).not.toBeChecked()
    await expect(submit).toBeDisabled()

    await vibePage.vibeCheck('register-dpa-initial')

    await checkbox.check()
    await expect(submit).not.toBeDisabled()
  })

  test('submit zonder DPA-vinkje blijft op /register en toont NL foutmelding', async ({ vibePage }) => {
    await vibePage.context().clearCookies()
    await vibePage.goto('/register')
    await vibePage.waitForLoadState('networkidle')

    const email = uniqueEmail()
    await vibePage.getByTestId('register-email').fill(email)
    await vibePage.locator('input[type="password"]').fill('VibeTest2026!')

    // Submit-knop is disabled zonder vinkje — forceer submit via form-dispatch
    // om te verifiëren dat server-side dezelfde regel handhaaft.
    await vibePage.getByTestId('register-form').evaluate((form: HTMLFormElement) => {
      form.requestSubmit()
    })

    await expect(vibePage).toHaveURL(/\/register/)
    const errorLocator = vibePage.getByTestId('register-error')
    await expect(errorLocator).toBeVisible()
    const errorText = (await errorLocator.textContent()) || ''
    expect(errorText.toLowerCase()).toContain('verwerkersovereenkomst')
  })

  // Deze test vereist een bereikbare Supabase-instance (signUp + admin listUsers).
  // Lokaal is de Supabase Cloud URL uit .env.local onbereikbaar (DNS NXDOMAIN) wegens
  // lopende migratie Cloud → Beelink self-host. We valideren de happy-path op staging
  // (Coolify-deploy met Beelink-Supabase binding) via de Rapport-curl in stap 5.
  // Zie docs/agent-log/2026-04-24-ordo-3-dpa-register-v2.md §Blokker.
  test.fixme('submit met DPA-vinkje schrijft rij in dpa_acceptance met actuele dpa_version', async ({ vibePage }) => {
    const email = uniqueEmail()
    const password = 'VibeTest2026!'

    try {
      await vibePage.context().clearCookies()
      await vibePage.goto('/register')
      await vibePage.waitForLoadState('networkidle')

      await vibePage.getByTestId('register-email').fill(email)
      await vibePage.locator('input[type="password"]').fill(password)
      await vibePage.getByTestId('register-dpa-checkbox').check()
      await vibePage.vibeCheck('register-dpa-submitted')

      await vibePage.getByTestId('register-submit').click()

      // Registratie met Supabase-email-confirm levert óf "controleer e-mail"-bevestiging
      // óf directe redirect naar /app (indien confirm uit staat). Beide OK.
      await expect(
        vibePage.getByTestId('register-done').or(vibePage.getByTestId('dashboard'))
      ).toBeVisible({ timeout: 15000 })

      const admin = adminClient()
      const { data: usersList } = await admin.auth.admin.listUsers()
      const created = usersList.users.find(u => u.email === email)
      expect(created, 'user bestaat in auth.users').toBeTruthy()

      const { data: rows, error } = await admin
        .from('dpa_acceptance')
        .select('user_id, dpa_version, ip_address, accepted_at')
        .eq('user_id', created!.id)
      expect(error).toBeNull()
      expect(rows).toHaveLength(1)
      expect(rows![0].dpa_version).toBe('2026-04-24')
    } finally {
      await cleanupUserByEmail(email).catch(() => {})
    }
  })
})
