import { test as setup, expect } from '@playwright/test'
import path from 'path'

const authFile = path.join(__dirname, '../../testing/vibe-core/auth-state.json')

setup('authenticeer test gebruiker', async ({ page }) => {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('login-form')).toBeVisible({ timeout: 10000 })

  await page.getByTestId('login-email').fill(process.env.TEST_EMAIL || 'test@retroductus.nl')
  await page.getByTestId('login-password').fill(process.env.TEST_PASSWORD || 'Retroductus2026x')
  await page.getByTestId('login-submit').click()

  // Wacht op redirect naar dashboard
  await page.waitForURL('**/app', { timeout: 15000 })
  await expect(page.getByTestId('dashboard')).toBeVisible({ timeout: 5000 })

  await page.context().storageState({ path: authFile })
})
