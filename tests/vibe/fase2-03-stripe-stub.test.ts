import { test, expect } from '../../testing/vibe-core/base.fixture'

/**
 * Ordo 5 — Stripe prep-only scaffold
 *
 * Stripe-routes zijn aanwezig als stub (501) zodat de feitelijke aansluiting later
 * "flip the switch" is. In deze fase mag er geen runtime-effect zijn:
 * - geen live Price ID's
 * - geen webhook die tenant-state flipt
 * - foutmeldingen in plain Nederlands, geen secrets
 *
 * Zie: docs/superpowers/plans/2026-04-24-fase-2-intern-testen.md (Ordo 5)
 */
test.describe('Ordo 5 — Stripe stub-routes', () => {
  test('POST /api/stripe/checkout retourneert 501 met NL errormsg', async ({ vibePage, request }) => {
    const response = await request.post('/api/stripe/checkout', {
      data: {},
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(501)

    const body = await response.json()
    expect(body).toHaveProperty('error')
    const error = String(body.error).toLowerCase()
    expect(error).toContain('stripe')
    expect(error).toMatch(/(nog niet|geactiveerd)/)
    // Geen secrets/stack-traces lekken naar client
    expect(error).not.toContain('sk_')
    expect(error).not.toContain('whsec_')
    expect(error).not.toContain('process.env')
    expect(error).not.toContain('node_modules')

    // Surface een visuele checkpoint voor het rapport. We laden /register zodat
    // de page-context bruikbaar blijft voor screenshots; de assertie zit op de
    // request-response hierboven.
    await vibePage.goto('/register')
    await vibePage.waitForLoadState('domcontentloaded')
    await vibePage.vibeCheck('stripe-checkout-stub')
  })

  test('POST /api/stripe/webhook retourneert 501 op willekeurige body', async ({ vibePage, request }) => {
    const response = await request.post('/api/stripe/webhook', {
      data: 'random-body-no-signature',
      headers: { 'Content-Type': 'application/json' },
      failOnStatusCode: false,
    })

    expect(response.status()).toBe(501)

    const body = await response.json()
    expect(body).toHaveProperty('error')
    const error = String(body.error).toLowerCase()
    expect(error).toContain('stripe')
    expect(error).toMatch(/(nog niet|geactiveerd)/)
    expect(error).not.toContain('whsec_')

    await vibePage.goto('/register')
    await vibePage.waitForLoadState('domcontentloaded')
    await vibePage.vibeCheck('stripe-webhook-stub')
  })

  test('GET /api/stripe/checkout geeft 405 (Next.js default) — gedocumenteerd gedrag', async ({ request }) => {
    // Next.js 15 App Router retourneert 405 Method Not Allowed voor methodes die
    // niet als handler geëxporteerd zijn op een route-bestand. We exporteren alleen
    // POST in de stub, dus GET valt terug op die default — bewust geen extra GET-handler
    // om de stub minimaal te houden.
    const response = await request.get('/api/stripe/checkout', { failOnStatusCode: false })
    expect([405, 501]).toContain(response.status())
  })
})
