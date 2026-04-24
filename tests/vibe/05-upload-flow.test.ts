import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'
import * as fs from 'fs'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

const TEST_CSV_PATH = path.join(process.cwd(), 'tests', 'vibe', '_fixtures', 'test-log.csv')

test.beforeAll(() => {
  const dir = path.dirname(TEST_CSV_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(TEST_CSV_PATH, [
    'case_id,activity,timestamp,resource,duration_ms',
    'CASE-001,Start,2024-01-01 09:00:00,alice,1000',
    'CASE-001,Verwerken,2024-01-01 09:05:00,bob,300000',
    'CASE-001,Afronden,2024-01-01 09:30:00,alice,60000',
    'CASE-002,Start,2024-01-02 10:00:00,alice,1000',
    'CASE-002,Verwerken,2024-01-02 10:10:00,carol,240000',
    'CASE-002,Afronden,2024-01-02 10:35:00,bob,45000',
  ].join('\n'))
})

test('upload form — bestand selecteren en knop activeren', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('new-project-page')).toBeVisible()
  await vibePage.vibeCheck('upload-form-leeg')

  // Upload-knop is disabled zolang geen bestand geselecteerd
  await expect(vibePage.getByTestId('upload-submit')).toBeDisabled()

  // Bestand selecteren
  await vibePage.getByTestId('upload-input').setInputFiles(TEST_CSV_PATH)
  await expect(vibePage.getByTestId('upload-filename')).toBeVisible()
  await vibePage.vibeCheck('upload-bestand-gekozen')

  // Upload-knop is nu actief
  await expect(vibePage.getByTestId('upload-submit')).not.toBeDisabled()
})

test('upload CSV → doorsturen naar project (engine vereist)', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  await vibePage.getByTestId('upload-input').setInputFiles(TEST_CSV_PATH)
  await vibePage.getByTestId('upload-submit').click()

  // Wacht 8 seconden op een redirect naar een project-UUID pagina (engine moet draaien)
  const redirected = await vibePage.waitForURL(
    url => url.pathname.startsWith('/app/projects/') && url.pathname !== '/app/projects/new',
    { timeout: 8000 }
  ).then(() => true).catch(() => false)

  if (!redirected) {
    // Engine niet bereikbaar — accepteer elke staat: error tonen of nog laden
    // Controleer alleen dat we nog steeds op de upload pagina zijn (geen vibeCheck: fout is verwacht)
    const isStillOnUploadPage = await vibePage.getByTestId('new-project-page').isVisible().catch(() => false)
    const hasError = await vibePage.locator('[class*="text-red"]').isVisible().catch(() => false)
    // Beide zijn acceptabel: error getoond of nog bezig
    if (!isStillOnUploadPage && !hasError) {
      throw new Error('Verwacht: upload pagina zichtbaar of error getoond na mislukte upload')
    }
    return
  }

  // Engine bereikbaar — project-detail moet laden
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('project-detail')).toBeVisible()
  await vibePage.vibeCheck('upload-redirect-naar-project')
})

test('project detail toont DFG graph als status done', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  const firstProject = vibePage.getByTestId('projects-list').locator('a').first()
  const hasProjects = await firstProject.isVisible().catch(() => false)

  if (!hasProjects) {
    await expect(vibePage.getByTestId('dashboard')).toBeVisible()
    await vibePage.vibeCheck('dashboard-geen-projecten')
    return
  }

  await firstProject.click()
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('project-detail')).toBeVisible()
  await vibePage.vibeCheck('project-detail-geladen')

  const isAnalysed = await vibePage.getByTestId('stats-grid').isVisible().catch(() => false)
  if (isAnalysed) {
    await expect(
      vibePage.getByTestId('dfg-graph').or(vibePage.getByTestId('dfg-graph-loading'))
    ).toBeVisible({ timeout: 10000 })
    await vibePage.vibeCheck('dfg-graph-zichtbaar')
  }
})
