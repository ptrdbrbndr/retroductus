import { test, expect } from '../../testing/vibe-core/base.fixture'

test('landingspagina is bereikbaar en toont hero', async ({ vibePage: page }) => {
  await page.goto('/')
  await page.vibeCheck('landing-loaded')
  await expect(page.getByTestId('hero-title')).toBeVisible()
})

test('landingspagina toont pricing sectie', async ({ vibePage: page }) => {
  await page.goto('/')
  await page.vibeCheck('landing-pricing')
  await expect(page.getByTestId('pricing-section')).toBeVisible()
})

test('login link op landingspagina leidt naar login of app', async ({ vibePage: page }) => {
  await page.goto('/')
  await page.getByTestId('nav-login').click()
  await page.vibeCheck('nav-to-login')
  // Ingelogde gebruiker → /app, uitgelogde gebruiker → /login
  await expect(page).toHaveURL(/\/(login|app)/)
})
