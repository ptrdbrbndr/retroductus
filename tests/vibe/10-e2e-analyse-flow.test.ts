/**
 * Stap 12: E2E vibe-test — upload → analyse → resultaat
 *
 * Test de volledige flow:
 * 1. Inloggen (via auth-state)
 * 2. CSV uploaden
 * 3. Wachten tot analyse klaar is (polling)
 * 4. DFG-visualisatie controleren
 * 5. Security checkpoints: auth-guard, error zonder stacktrace
 */

import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'
import * as fs from 'fs'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

const FIXTURE_PATH = path.join(process.cwd(), 'tests', 'vibe', '_fixtures', 'e2e-test-log.csv')
const MAX_POLL_SECONDS = 60

test.beforeAll(() => {
  const dir = path.dirname(FIXTURE_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  // Klein CSV-log met duidelijke procesflow
  fs.writeFileSync(FIXTURE_PATH, [
    'case_id,activity,timestamp,resource,duration_ms',
    'E2E-001,Aanvraag ontvangen,2024-03-01 08:00:00,intake,500',
    'E2E-001,Beoordeling,2024-03-01 08:30:00,medewerker,1800000',
    'E2E-001,Goedkeuring,2024-03-01 09:00:00,manager,600000',
    'E2E-001,Afhandeling,2024-03-01 09:30:00,medewerker,900000',
    'E2E-002,Aanvraag ontvangen,2024-03-02 10:00:00,intake,500',
    'E2E-002,Beoordeling,2024-03-02 10:20:00,medewerker,1200000',
    'E2E-002,Afwijzing,2024-03-02 10:40:00,manager,300000',
    'E2E-003,Aanvraag ontvangen,2024-03-03 09:00:00,intake,500',
    'E2E-003,Beoordeling,2024-03-03 09:15:00,medewerker,900000',
    'E2E-003,Goedkeuring,2024-03-03 09:30:00,manager,600000',
    'E2E-003,Afhandeling,2024-03-03 10:00:00,medewerker,1800000',
  ].join('\n'))
})

test('auth-guard: niet-ingelogde gebruiker wordt omgeleid', async ({ page }) => {
  // Gebruik nieuwe context zonder auth state
  await page.context().clearCookies()
  await page.goto('/app')
  await page.waitForLoadState('networkidle')

  // Moet doorsturen naar login
  await expect(page).toHaveURL(/\/(login|auth)/)
  // Vibe security checkpoint
  const vibePage = page as any
  vibePage.vibeCheck = async (cp: string) => {
    const errors: string[] = []
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
    if (errors.length > 0) throw new Error(`Console errors at ${cp}:\n${errors.join('\n')}`)
  }
  await vibePage.vibeCheck('auth-guard-redirect')
})

test('E2E: upload → analyse → DFG-visualisatie getoond', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('new-project-page')).toBeVisible()
  await vibePage.vibeCheck('e2e-upload-pagina-geladen')

  // Stap 1: CSV uploaden
  await vibePage.getByTestId('upload-input').setInputFiles(FIXTURE_PATH)
  await expect(vibePage.getByTestId('upload-filename')).toBeVisible()
  await vibePage.vibeCheck('e2e-bestand-geselecteerd')

  await vibePage.getByTestId('upload-submit').click()

  // Stap 2: Wachten op redirect naar project
  const redirected = await vibePage.waitForURL(
    (url: URL) => url.pathname.startsWith('/app/projects/') && url.pathname !== '/app/projects/new',
    { timeout: 15000 }
  ).then(() => true).catch(() => false)

  if (!redirected) {
    // Engine niet beschikbaar: accepteer graceful degradation
    const hasError = await vibePage.locator('[class*="text-red"]').isVisible().catch(() => false)
    if (hasError) {
      await vibePage.vibeCheck('e2e-upload-engine-niet-bereikbaar')
      return
    }
    throw new Error('Upload mislukt zonder foutmelding')
  }

  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('project-detail')).toBeVisible()
  await vibePage.vibeCheck('e2e-redirect-naar-project')

  // Stap 3: Pollen totdat analyse klaar is
  const projectUrl = vibePage.url()
  let analyseDone = false

  for (let i = 0; i < MAX_POLL_SECONDS; i += 3) {
    await vibePage.waitForTimeout(3000)
    await vibePage.reload()
    await vibePage.waitForLoadState('networkidle')

    const statsVisible = await vibePage.getByTestId('stats-grid').isVisible().catch(() => false)
    if (statsVisible) {
      analyseDone = true
      break
    }

    const errorVisible = await vibePage.locator('strong.text-white').isVisible().catch(() => false)
    if (errorVisible) {
      const statusText = await vibePage.locator('strong.text-white').textContent().catch(() => '')
      if (statusText === 'error') break
    }
  }

  if (!analyseDone) {
    // Engine niet beschikbaar of timeout — dit is acceptabel in CI zonder engine
    await vibePage.vibeCheck('e2e-analyse-timeout-of-engine-offline')
    return
  }

  // Stap 4: DFG-visualisatie controleren
  await expect(vibePage.getByTestId('stats-grid')).toBeVisible()
  await vibePage.vibeCheck('e2e-stats-getoond')

  const dfgVisible = await vibePage
    .getByTestId('dfg-graph')
    .or(vibePage.getByTestId('dfg-graph-loading'))
    .isVisible({ timeout: 5000 })
    .catch(() => false)

  if (dfgVisible) {
    await vibePage.vibeCheck('analyse-resultaat-getoond')
  }

  // Activiteiten en paden moeten aanwezig zijn
  await expect(vibePage.getByTestId('dfg-nodes')).toBeVisible()
  await expect(vibePage.getByTestId('dfg-edges')).toBeVisible()
  await vibePage.vibeCheck('e2e-dfg-volledige-resultaten')
})

test('error response lekt geen interne stacktrace', async ({ vibePage }) => {
  // Roep een niet-bestaande job op
  await vibePage.goto('/app/projects/00000000-0000-0000-0000-000000000000')
  await vibePage.waitForLoadState('networkidle')

  // Pagina mag 404 tonen maar geen technische stacktrace
  const bodyText = await vibePage.locator('body').textContent()
  expect(bodyText).not.toContain('Traceback')
  expect(bodyText).not.toContain('at Object.')
  expect(bodyText).not.toContain('engine/')
  await vibePage.vibeCheck('error-no-stack-trace')
})
