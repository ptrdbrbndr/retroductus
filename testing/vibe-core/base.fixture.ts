import { test as base, expect, type Page } from '@playwright/test'

type VibePage = Page & {
  vibeCheck: (checkpointName: string) => Promise<void>
}

export { expect }

export const test = base.extend<{ vibePage: VibePage }>({
  vibePage: async ({ page }, use) => {
    const consoleErrors: string[] = []

    // Known non-critical console errors to ignore
    const IGNORED_PATTERNS = [
      /Failed to load resource/i,   // HTTP errors from API calls (401, 404, 500 etc.)
      /keyboard\.bindTo/i,          // diagram-js keyboard deprecation
      /unsupported configuration/i, // bpmn-js config warnings logged as errors
    ]

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text()
        const isIgnored = IGNORED_PATTERNS.some((p) => p.test(text))
        if (!isIgnored) {
          consoleErrors.push(text)
        }
      }
    })

    const vibePage = page as VibePage
    vibePage.vibeCheck = async (checkpointName: string) => {
      // Fail immediately if console errors accumulated
      if (consoleErrors.length > 0) {
        throw new Error(
          `vibeCheck '${checkpointName}' failed — console errors:\n${consoleErrors.join('\n')}`
        )
      }
      await page.screenshot({
        path: `test-results/checkpoints/${checkpointName.replace(/[\s/]/g, '-')}.png`,
        fullPage: false,
      })
    }

    await use(vibePage)
  },
})
