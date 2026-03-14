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

test('uitloggen redirect naar login', async ({ vibePage }) => {
  await vibePage.goto('/app')
  await vibePage.waitForLoadState('networkidle')

  await vibePage.getByTestId('nav-logout').click()
  await vibePage.waitForURL('**/login')
  await expect(vibePage).toHaveURL(/\/login/)
})
