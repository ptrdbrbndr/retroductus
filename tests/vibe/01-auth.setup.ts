import { test as setup, expect } from '@playwright/test'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const authFile = path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json')

const VIBE_TEST_USER = process.env.VIBE_TEST_USER
const VIBE_TEST_PASSWORD = process.env.VIBE_TEST_PASSWORD

setup('authenticate', async ({ page }) => {
  if (!VIBE_TEST_USER || !VIBE_TEST_PASSWORD) {
    throw new Error(
      'Vibe-auth-setup vereist VIBE_TEST_USER + VIBE_TEST_PASSWORD in .env.local',
    )
  }

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByTestId('login-email').fill(VIBE_TEST_USER)
  await page.getByTestId('login-password').fill(VIBE_TEST_PASSWORD)
  await page.getByTestId('login-submit').click()

  await page.waitForURL('**/app', { timeout: 10000 })
  await expect(page.getByTestId('dashboard')).toBeVisible()

  await page.context().storageState({ path: authFile })
})
