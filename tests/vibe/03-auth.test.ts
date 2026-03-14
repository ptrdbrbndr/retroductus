import { test, expect } from '../../testing/vibe-core/base.fixture'

test('login page visible', async ({ vibePage }) => {
  await vibePage.context().clearCookies()
  await vibePage.goto('/login')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('login-form')).toBeVisible()
  await vibePage.vibeCheck('login-form')
})

test('register page visible', async ({ vibePage }) => {
  await vibePage.context().clearCookies()
  await vibePage.goto('/register')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('register-form')).toBeVisible()
  await vibePage.vibeCheck('register-form')
})

test('/app redirects to /login without session', async ({ vibePage }) => {
  await vibePage.context().clearCookies()
  await vibePage.goto('/app')
  await vibePage.waitForURL('**/login')
  await expect(vibePage).toHaveURL(/\/login/)
})
