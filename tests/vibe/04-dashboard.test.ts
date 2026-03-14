import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

test.use({ storageState: path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json') })

test('dashboard zichtbaar', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('dashboard')).toBeVisible()
  await vibePage.vibeCheck('dashboard')
})

test('nieuw project pagina', async ({ vibePage }) => {
  await vibePage.goto('/app/projects/new')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('new-project-page')).toBeVisible()
  await expect(vibePage.getByTestId('upload-dropzone')).toBeVisible()
  await vibePage.vibeCheck('new-project')
})

test('logout knop aanwezig in dashboard', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  await expect(vibePage.getByTestId('nav-logout')).toBeVisible()
  await vibePage.vibeCheck('logout-knop-zichtbaar')
})
