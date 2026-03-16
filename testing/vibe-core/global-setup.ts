import { chromium } from '@playwright/test'

const BASE_URL = process.env.VIBE_BASE_URL || 'http://localhost:3001'

const WARM_UP_PAGES = [
  '/',
  '/login',
  '/register',
  '/app',
  '/app/embed-demo',
  '/app/settings',
  '/app/settings/issues',
  '/app/projects/new',
]

async function warmPage(page: import('@playwright/test').Page, url: string, retries = 5): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 30000 })
      return
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 3000))
    }
  }
}

export default async function globalSetup() {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  for (const path of WARM_UP_PAGES) {
    await warmPage(page, `${BASE_URL}${path}`)
  }

  // Extra pause to ensure Next.js finishes compiling all queued pages
  await new Promise(r => setTimeout(r, 2000))
  await browser.close()
}
