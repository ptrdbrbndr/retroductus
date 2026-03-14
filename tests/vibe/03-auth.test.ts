import { test, expect } from '../../testing/vibe-core/base.fixture'

test('login pagina toont formulier', async ({ vibePage: page }) => {
  await page.goto('/login')
  await page.vibeCheck('login-page-loaded')
  await expect(page.getByTestId('login-form')).toBeVisible()
  await expect(page.getByTestId('login-email')).toBeVisible()
  await expect(page.getByTestId('login-password')).toBeVisible()
  await expect(page.getByTestId('login-submit')).toBeVisible()
})

test('register pagina toont formulier', async ({ vibePage: page }) => {
  await page.goto('/register')
  await page.vibeCheck('register-page-loaded')
  await expect(page.getByTestId('register-form')).toBeVisible()
  await expect(page.getByTestId('register-email')).toBeVisible()
  await expect(page.getByTestId('register-submit')).toBeVisible()
})

test('/app redirect naar login zonder sessie', async ({ vibePage: page }) => {
  // Geen auth state — moet doorsturen
  await page.context().clearCookies()
  await page.goto('/app')
  await page.vibeCheck('redirect-to-login')
  await expect(page).toHaveURL(/\/login/)
})
