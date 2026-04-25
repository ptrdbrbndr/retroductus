import { NextResponse } from 'next/server'

/**
 * Stripe webhook — prep-only stub (Ordo 5, Fase 2 intern testen).
 *
 * Retourneert bewust 501 zonder de body te parsen of een signature te verifiëren:
 * - `STRIPE_WEBHOOK_SECRET` is leeg in deze fase, dus signature-verificatie zou
 *   altijd falen of ten onrechte slagen — beide ongewenst.
 * - De stub mag GEEN tenant-state flippen (geen plan-upgrade, geen quota-aanpassing).
 *
 * Activatie volgt zodra de Stripe-account live is en de webhook-endpoint daar is
 * geregistreerd; pas dan vervangen we deze stub door een implementatie met
 * `stripe.webhooks.constructEvent` + idempotente event-handlers.
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Stripe webhook is nog niet geactiveerd.' },
    { status: 501 }
  )
}
