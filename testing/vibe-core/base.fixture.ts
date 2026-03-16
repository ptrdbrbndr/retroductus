import { test as baseTest, expect, Page } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

export { expect }

type VibePage = Page & {
  vibeCheck: (checkpoint: string) => Promise<void>
}

export const test = baseTest.extend<{ vibePage: VibePage }>({
  vibePage: async ({ page }, use) => {
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Filter React 19 hydration warnings caused by Chrome auto-applying
        // caret-color: transparent to input elements (browser behavior, not app bug)
        if (text.includes('caret-color') && text.includes('hydrat')) return
        // Filter browser-native "Failed to load resource: 404" messages — real localhost 404s
        // are already tracked with their full URL via the response handler below.
        if (text.includes('Failed to load resource') && text.includes('404')) return
        errors.push(text)
      }
    })
    page.on('response', response => {
      if (response.status() === 404 && response.url().includes('localhost')) {
        // Ignore Next.js HMR hot-update.json 404s — dev-mode artifact when
        // the server recompiles and the browser's HMR client has a stale hash
        if (response.url().includes('hot-update')) return
        errors.push(`404 Not Found: ${response.url()}`)
      }
    })

    const vibePage = page as VibePage
    vibePage.vibeCheck = async (checkpoint: string) => {
      const screenshotDir = path.join(process.cwd(), 'testing', 'vibe-core', 'screenshots')
      fs.mkdirSync(screenshotDir, { recursive: true })
      await page.screenshot({
        path: path.join(screenshotDir, `${checkpoint.replace(/[^a-z0-9]/gi, '-')}.png`),
        fullPage: true,
      })
      if (errors.length > 0) {
        throw new Error(`Console errors at checkpoint "${checkpoint}":\n${errors.join('\n')}`)
      }
    }

    await use(vibePage)
  },
})
