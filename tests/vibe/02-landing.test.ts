import { test, expect } from '../../testing/vibe-core/base.fixture'

test.use({ storageState: { cookies: [], origins: [] } })

test('landing page — hero + nav login', async ({ vibePage }) => {
  await vibePage.goto('/')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('hero-title')).toBeVisible()
  await vibePage.vibeCheck('landing-hero')

  await vibePage.getByTestId('nav-login').click()
  await expect(vibePage).toHaveURL(/\/(login|app)/)
})
