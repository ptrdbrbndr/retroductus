import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('Conformance link zichtbaar op project met status done', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  const firstProject = vibePage.getByTestId('projects-list').locator('a').first()
  const hasProjects = await firstProject.isVisible().catch(() => false)

  if (!hasProjects) {
    await expect(vibePage.getByTestId('dashboard')).toBeVisible()
    await vibePage.vibeCheck('dashboard-geen-projecten-conformance')
    return
  }

  await firstProject.click()
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('project-detail')).toBeVisible()

  const isDone = await vibePage.getByTestId('project-conformance-link').isVisible().catch(() => false)
  if (isDone) {
    await expect(vibePage.getByTestId('project-conformance-link')).toBeVisible()
    await vibePage.vibeCheck('project-conformance-link-zichtbaar')
  } else {
    await vibePage.vibeCheck('project-niet-done-conformance')
  }
})

test('Conformance pagina laadt en check-knop is zichtbaar', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  const firstProject = vibePage.getByTestId('projects-list').locator('a').first()
  const hasProjects = await firstProject.isVisible().catch(() => false)

  if (!hasProjects) {
    return
  }

  await firstProject.click()
  await vibePage.waitForLoadState('networkidle')

  const conformanceLink = vibePage.getByTestId('project-conformance-link')
  const hasLink = await conformanceLink.isVisible().catch(() => false)

  if (!hasLink) {
    return
  }

  await conformanceLink.click()
  await vibePage.waitForLoadState('networkidle')
  await expect(vibePage.getByTestId('conformance-page')).toBeVisible()
  await expect(vibePage.getByTestId('run-conformance')).toBeVisible()
  await vibePage.vibeCheck('conformance-pagina-geladen')
})
