import { NextResponse } from 'next/server'

/**
 * Stripe checkout — prep-only stub (Ordo 5, Fase 2 intern testen).
 *
 * Retourneert bewust 501 Not Implemented zolang Stripe niet feitelijk is aangesloten.
 * Geen body-parsing, geen Stripe-SDK-init met live key — `STRIPE_SECRET_KEY` is leeg
 * in deze fase en de stub mag nooit een live checkout-sessie aanmaken.
 *
 * Activatie volgt in een latere fase (zie BUSINESSPLAN.md, post-Fase-2).
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe is nog niet geactiveerd voor dit account.' },
    { status: 501 }
  )
}
