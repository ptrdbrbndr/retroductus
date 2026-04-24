import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const { email } = await req.json().catch(() => ({}))

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ message: 'Ongeldig e-mailadres' }, { status: 400 })
  }

  const supabase = await createClient()

  // Sla op in subscribers tabel (aanmaken indien niet bestaat)
  const { error } = await supabase
    .from('subscribers')
    .upsert({ email, source: 'waitlist', subscribed_at: new Date().toISOString() }, { onConflict: 'email' })

  if (error) {
    console.error('Subscribe error:', error)
    return Response.json({ message: 'Er ging iets mis. Probeer het later opnieuw.' }, { status: 500 })
  }

  return Response.json({ ok: true })
}
