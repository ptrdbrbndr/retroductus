import { test, expect } from '../../testing/vibe-core/base.fixture'

test.use({ storageState: { cookies: [], origins: [] } })

test('landing page — hero + nav login', async ({ vibePage }) => {
  await vibePage.goto('/')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('hero-title')).toBeVisible()
  await vibePage.vibeCheck('landing-hero')

  const navLogin = vibePage.getByTestId('nav-login')
  await expect(navLogin).toBeVisible()
  const href = await navLogin.getAttribute('href')
  if (!href?.includes('login')) {
    throw new Error(`nav-login href moet 'login' bevatten, maar is: ${href}`)
  }
  await vibePage.vibeCheck('nav-login-link-aanwezig')
})
