import { test, expect } from '../../testing/vibe-core/base.fixture'

test('dashboard toont na inloggen', async ({ vibePage: page }) => {
  await page.goto('/app')
  await page.vibeCheck('dashboard-loaded')
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 10000 })
  await expect(page.getByTestId('app-nav')).toBeVisible()
})

test('dashboard heeft nieuw project knop', async ({ vibePage: page }) => {
  await page.goto('/app')
  await page.vibeCheck('dashboard-nav')
  await expect(page.getByTestId('dashboard-new-project')).toBeVisible({ timeout: 5000 })
})

test('nieuw project pagina is bereikbaar', async ({ vibePage: page }) => {
  await page.goto('/app/projects/new')
  await page.vibeCheck('new-project-loaded')
  await expect(page.getByTestId('new-project-page')).toBeVisible({ timeout: 5000 })
  await expect(page.getByTestId('upload-dropzone')).toBeVisible()
  await expect(page.getByTestId('upload-submit')).toBeVisible()
})

test('uitloggen redirect naar login', async ({ vibePage: page }) => {
  await page.goto('/app')
  await expect(page.getByTestId('nav-logout')).toBeVisible({ timeout: 5000 })
  await page.getByTestId('nav-logout').click()
  await page.vibeCheck('logged-out')
  await expect(page).toHaveURL(/\/login/)
})
