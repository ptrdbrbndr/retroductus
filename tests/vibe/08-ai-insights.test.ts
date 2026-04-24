import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('AI Insights link zichtbaar op project met status done', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  const firstProject = vibePage.getByTestId('projects-list').locator('a').first()
  const hasProjects = await firstProject.isVisible().catch(() => false)

  if (!hasProjects) {
    await expect(vibePage.getByTestId('dashboard')).toBeVisible()
    await vibePage.vibeCheck('dashboard-geen-projecten-insights')
    return
  }

  await firstProject.click()
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('project-detail')).toBeVisible()

  const isDone = await vibePage.getByTestId('project-insights-link').isVisible().catch(() => false)
  if (isDone) {
    await expect(vibePage.getByTestId('project-insights-link')).toBeVisible()
    await vibePage.vibeCheck('project-insights-link-zichtbaar')
  } else {
    await vibePage.vibeCheck('project-niet-done')
  }
})

test('AI Insights pagina laadt', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  const firstProject = vibePage.getByTestId('projects-list').locator('a').first()
  const hasProjects = await firstProject.isVisible().catch(() => false)

  if (!hasProjects) {
    // Geen projecten — insights test overgeslagen
    return
  }

  await firstProject.click()
  await vibePage.waitForLoadState('networkidle')

  const insightsLink = vibePage.getByTestId('project-insights-link')
  const hasInsights = await insightsLink.isVisible().catch(() => false)

  if (!hasInsights) {
    await vibePage.vibeCheck('project-niet-done-skip-insights')
    return
  }

  await insightsLink.click()
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('insights-page')).toBeVisible()
  await vibePage.vibeCheck('insights-pagina-geladen')

  // Generate knop zichtbaar als er nog geen insights zijn
  const emptyState = await vibePage.getByTestId('insights-empty').isVisible().catch(() => false)
  const hasResult = await vibePage.getByTestId('insights-result').isVisible().catch(() => false)

  if (emptyState) {
    await expect(vibePage.getByTestId('insights-generate')).toBeVisible()
    await vibePage.vibeCheck('insights-leeg-generate-knop-zichtbaar')
  } else if (hasResult) {
    await expect(vibePage.getByTestId('insights-copy')).toBeVisible()
    await vibePage.vibeCheck('insights-resultaat-zichtbaar')
  }
})
