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
      if (msg.type() === 'error') errors.push(msg.text())
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
