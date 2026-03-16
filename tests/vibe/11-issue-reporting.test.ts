import { test, expect } from '../../testing/vibe-core/base.fixture'
import * as path from 'path'

const AUTH_STATE = path.join(process.cwd(), 'testing', 'vibe-core', 'auth-state.json')

// API: unauthenticated access geblokkeerd (geen storageState)
test.describe('API auth', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('issues GET vereist authenticatie', async ({ request }) => {
    const res = await request.get('/api/issues')
    expect(res.status()).toBe(401)
  })

  test('issues POST vereist authenticatie', async ({ request }) => {
    const res = await request.post('/api/issues', {
      data: { category: 'bug', title: 'test', description: 'test' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('issues DELETE vereist authenticatie', async ({ request }) => {
    const res = await request.delete('/api/issues/nonexistent-id')
    expect(res.status()).toBe(401)
  })
})

// UI: geauthenticeerde tests
test.describe('UI issue-reporting', () => {
  test.use({ storageState: AUTH_STATE })

  // Zwevende knop zichtbaar op het dashboard
  test('issue-meldknop zichtbaar op het dashboard', async ({ vibePage: page }) => {
    await page.goto('/app')
    await expect(page.getByTestId('report-issue-btn')).toBeVisible({ timeout: 8000 })
    await page.vibeCheck('issue-btn-visible')
  })

  // Knop afwezig in embedded modus
  test('issue-meldknop verborgen in embedded modus', async ({ vibePage: page }) => {
    await page.goto('/app?embedded=true')
    await page.waitForTimeout(500)
    const btn = page.getByTestId('report-issue-btn')
    await expect(btn).not.toBeVisible()
    await page.vibeCheck('issue-btn-hidden-embedded')
  })

  // Modal openen en sluiten
  test('issue modal opent en sluit', async ({ vibePage: page }) => {
    await page.goto('/app')
    await page.getByTestId('report-issue-btn').click()
    await expect(page.getByTestId('issue-modal')).toBeVisible()
    await page.vibeCheck('issue-modal-open')

    await page.getByTestId('issue-modal-close').click()
    await expect(page.getByTestId('issue-modal')).not.toBeVisible()
    await page.vibeCheck('issue-modal-closed')
  })

  // Issue indienen toont succesbericht
  test('issue indienen toont succesbericht', async ({ vibePage: page }) => {
    await page.goto('/app')
    await page.getByTestId('report-issue-btn').click()
    await expect(page.getByTestId('issue-modal')).toBeVisible()

    await page.getByTestId('issue-category').selectOption('bug')
    await page.getByTestId('issue-priority').selectOption('hoog')
    await page.getByTestId('issue-title').fill('Testmelding vanuit vibe-test')
    await page.getByTestId('issue-description').fill('Dit is een automatisch aangemaakt testissue.')

    await page.getByTestId('submit-issue-btn').click()
    await page.vibeCheck('issue-submit-loading')

    // Modal sluit na succesbericht
    await expect(page.getByTestId('issue-modal')).not.toBeVisible({ timeout: 6000 })
    await page.vibeCheck('issue-submit-success')
  })

  // Navigatie toont instellingen link
  test('navigatie toont instellingen link', async ({ vibePage: page }) => {
    await page.goto('/app')
    await expect(page.getByTestId('nav-settings')).toBeVisible({ timeout: 5000 })
    await page.vibeCheck('nav-settings-visible')
  })

  // Instellingen pagina laadt
  test('instellingen pagina laadt', async ({ vibePage: page }) => {
    await page.goto('/app/settings')
    await expect(page.getByTestId('settings-issues-link')).toBeVisible({ timeout: 5000 })
    await page.vibeCheck('settings-page-loaded')
  })

  // Issueoverzicht pagina laadt
  test('issueoverzicht pagina laadt', async ({ vibePage: page }) => {
    await page.goto('/app/settings/issues')
    await page.waitForLoadState('networkidle')
    // Wacht tot laden klaar is (loading-indicator verdwijnt)
    await page.waitForFunction(() => !document.body.innerText.includes('Laden...'), { timeout: 8000 }).catch(() => {})
    const hasTable = await page.getByTestId('issues-table').isVisible().catch(() => false)
    const hasEmpty = await page.getByText('Nog geen issues gemeld.').isVisible().catch(() => false)
    expect(hasTable || hasEmpty).toBeTruthy()
    await page.vibeCheck('issues-overview-loaded')
  })

  // Security: unauthenticated toegang redirect naar login
  test('issueoverzicht vereist login', async ({ vibePage: page }) => {
    await page.context().clearCookies()
    await page.goto('/app/settings/issues')
    await expect(page).toHaveURL(/login/, { timeout: 5000 })
    await page.vibeCheck('auth-guard-redirect')
  })
})
