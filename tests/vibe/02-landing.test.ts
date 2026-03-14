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

test('login link op landingspagina werkt', async ({ vibePage: page }) => {
  await page.goto('/')
  await page.getByTestId('nav-login').click()
  await page.vibeCheck('nav-to-login')
  await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 5000 })
})
