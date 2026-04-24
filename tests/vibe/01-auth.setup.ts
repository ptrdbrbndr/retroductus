import { test as setup, expect } from '@playwright/test'
import * as path from 'path'

const authFile = path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json')

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('login-email').fill('test@retroductus.nl')
  await page.getByTestId('login-password').fill('Retroductus2026x')
  await page.getByTestId('login-submit').click()

  await page.waitForURL('**/app', { timeout: 10000 })
  await expect(page.getByTestId('dashboard')).toBeVisible()

  await page.context().storageState({ path: authFile })
})
