/**
 * Stripe plans — prep-only, not wired (Ordo 5, Fase 2 intern testen).
 *
 * Definieert de drie Retroductus-plans met limits + (toekomstige) Price IDs.
 * In deze fase staan er nog GEEN live Price IDs in de env-vars; `priceId`
 * blijft null totdat de plans definitief zijn aangemaakt in het Stripe-dashboard.
 *
 * Belangrijk:
 * - Pro gebruikt `Number.POSITIVE_INFINITY` i.p.v. `Infinity` om TS-strict-mode-issues
 *   te vermijden bij JSON-serialisatie en numerieke vergelijkingen.
 * - `as const` zorgt voor type-narrowing zodat `PlanId` exact 'free' | 'starter' | 'pro' is.
 * - Geen Stripe-SDK-import hier — deze module is puur metadata en bruikbaar in zowel
 *   server- als client-context.
 */

export const PLANS = {
  free: {
    priceId: null,
    limits: { events: 10_000, projects: 1 },
  },
  starter: {
    priceId: process.env.STRIPE_PRICE_STARTER || null,
    limits: { events: 100_000, projects: 5 },
  },
  pro: {
    priceId: process.env.STRIPE_PRICE_PRO || null,
    limits: { events: Number.POSITIVE_INFINITY, projects: Number.POSITIVE_INFINITY },
  },
} as const

export type PlanId = keyof typeof PLANS
