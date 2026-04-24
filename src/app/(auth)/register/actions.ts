'use server'

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { DPA_VERSION } from '@/lib/constants'

export type RegisterResult =
  | { ok: true; requiresEmailConfirm: boolean }
  | { ok: false; error: string }

const DPA_REQUIRED_ERROR =
  'Je moet de Verwerkersovereenkomst accepteren om verder te gaan.'
const INVALID_INPUT_ERROR =
  'Controleer je e-mailadres en wachtwoord (minimaal 8 tekens).'
const DPA_INSERT_ERROR =
  'Registratie niet voltooid: kon Verwerkersovereenkomst niet vastleggen. Probeer opnieuw of neem contact op met support.'

function resolveClientIp(headerList: Headers): string {
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return headerList.get('x-real-ip') ?? '0.0.0.0'
}

function isValidInput(email: string, password: string): boolean {
  if (!email || !email.includes('@')) return false
  if (!password || password.length < 8) return false
  return true
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const dpaAccepted = formData.get('dpa_accepted') === 'true'

  if (!dpaAccepted) {
    return { ok: false, error: DPA_REQUIRED_ERROR }
  }
  if (!isValidInput(email, password)) {
    return { ok: false, error: INVALID_INPUT_ERROR }
  }

  const supabase = await createClient()
  const headerList = await headers()
  const origin = headerList.get('origin') ?? ''

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  })

  if (signUpError || !data.user) {
    return { ok: false, error: signUpError?.message ?? 'Registratie mislukt.' }
  }

  const ip = resolveClientIp(headerList)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )

  const { error: dpaError } = await admin.from('dpa_acceptance').insert({
    user_id: data.user.id,
    dpa_version: DPA_VERSION,
    ip_address: ip,
  })

  if (dpaError) {
    // Privacy-by-design: zonder bewijs van DPA-acceptatie mag account niet bestaan.
    await admin.auth.admin.deleteUser(data.user.id).catch(() => {})
    return { ok: false, error: DPA_INSERT_ERROR }
  }

  return {
    ok: true,
    requiresEmailConfirm: !data.session,
  }
}
