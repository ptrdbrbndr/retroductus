import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('Flowable tab is zichtbaar op /app/projects/new', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('new-project-page')).toBeVisible()
  await expect(vibePage.getByTestId('tab-csv')).toBeVisible()
  await expect(vibePage.getByTestId('tab-flowable')).toBeVisible()

  await vibePage.vibeCheck('flowable-tabs-zichtbaar')
})

test('Flowable form-elementen zijn aanwezig na tab-klik', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  // Klik op Flowable tab
  await vibePage.getByTestId('tab-flowable').click()

  await expect(vibePage.getByTestId('flowable-db-url')).toBeVisible()
  await expect(vibePage.getByTestId('flowable-tenant-id')).toBeVisible()
  await expect(vibePage.getByTestId('flowable-test')).toBeVisible()
  await expect(vibePage.getByTestId('flowable-submit')).toBeVisible()

  await vibePage.vibeCheck('flowable-form-elementen-aanwezig')
})

test('Flowable test-knop is disabled als db_url leeg is', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  await vibePage.getByTestId('tab-flowable').click()

  // db_url is leeg → test-knop disabled
  await expect(vibePage.getByTestId('flowable-test')).toBeDisabled()

  await vibePage.vibeCheck('flowable-test-knop-disabled-leeg')
})

test('Flowable submit-knop is disabled totdat test geslaagd is', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('tab-flowable')).toBeVisible({ timeout: 10000 })
  await vibePage.getByTestId('tab-flowable').click()

  // Vul db_url in, maar test nog niet uitgevoerd
  await vibePage.getByTestId('flowable-db-url').fill('postgresql://user:pass@localhost:5432/flowable')

  // Submit-knop is disabled (test niet geslaagd)
  await expect(vibePage.getByTestId('flowable-submit')).toBeDisabled()

  // Test-knop is nu enabled
  await expect(vibePage.getByTestId('flowable-test')).not.toBeDisabled()

  await vibePage.vibeCheck('flowable-submit-disabled-voor-test')
})

test('Flowable CSV tab-inhoud is zichtbaar na wisselen', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  // Start op CSV tab
  await expect(vibePage.getByTestId('upload-form')).toBeVisible()

  // Wissel naar Flowable
  await vibePage.getByTestId('tab-flowable').click()
  await expect(vibePage.getByTestId('flowable-form')).toBeVisible()

  // Terug naar CSV
  await vibePage.getByTestId('tab-csv').click()
  await expect(vibePage.getByTestId('upload-form')).toBeVisible()

  await vibePage.vibeCheck('flowable-tab-wissel-werkt')
})
