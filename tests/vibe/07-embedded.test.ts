import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('embed-demo pagina laadt correct', async ({ vibePage }) => {
  await vibePage.goto('/app/embed-demo')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('embed-demo-page')).toBeVisible()
  await expect(vibePage.getByTestId('embed-demo-link-embedded')).toBeVisible()
  await expect(vibePage.getByTestId('embed-demo-link-normal')).toBeVisible()

  await vibePage.vibeCheck('embed-demo-pagina-geladen')
})

test('/app?embedded=true verbergt de navigatie', async ({ vibePage }) => {
  // Verwijder eerst eventuele embedded cookie van vorige runs (alleen die cookie)
  await vibePage.context().clearCookies({ name: 'retroductus_embedded' })

  await vibePage.goto('/app?embedded=true')
  await vibePage.waitForLoadState('networkidle')

  // Nav mag niet zichtbaar zijn in embedded modus
  // Wacht even op client-side hydration
  await vibePage.waitForTimeout(500)

  const navVisible = await vibePage.getByTestId('app-nav').isVisible().catch(() => false)
  // In embedded modus is de nav verborgen
  expect(navVisible).toBe(false)

  await vibePage.vibeCheck('embedded-nav-verborgen')
})

test('/app zonder embedded=true toont navigatie normaal', async ({ vibePage }) => {
  // Verwijder alleen de embedded cookie, bewaar auth cookies
  await vibePage.context().clearCookies({ name: 'retroductus_embedded' })

  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  // Wacht op hydration van EmbedLayout
  await vibePage.waitForTimeout(800)

  await expect(vibePage.getByTestId('app-nav')).toBeVisible()

  await vibePage.vibeCheck('normaal-nav-zichtbaar')
})
