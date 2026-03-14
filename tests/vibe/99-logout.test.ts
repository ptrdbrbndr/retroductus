// Dit bestand draait als laatste zodat de sessie niet vroegtijdig vervalt
import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('uitloggen redirect naar login', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  await vibePage.getByTestId('nav-logout').click()
  await vibePage.waitForURL('**/login')
  await expect(vibePage).toHaveURL(/\/login/)
  await vibePage.vibeCheck('uitgelogd')
})
