import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load from root .env for VIBE_BASE_URL
dotenv.config({ path: path.join(__dirname, '.env') })

export default defineConfig({
  testDir: './tests/vibe',
  globalSetup: './testing/vibe-core/global-setup.ts',
  fullyParallel: false,
  retries: 2,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.VIBE_BASE_URL || 'http://localhost:3001',
    trace: 'on-first-retry',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  expect: {
    timeout: 10000,
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--disable-features=Autofill,AutofillPopup,PasswordManagerSuggestions'],
        },
      },
      dependencies: ['setup'],
      testIgnore: /.*\.setup\.ts/,
    },
  ],
})
