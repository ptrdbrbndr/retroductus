import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })
  }

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  if (!engineUrl || !engineSecret) {
    return NextResponse.json({ error: 'Engine niet geconfigureerd' }, { status: 503 })
  }

  // Stuur het CSV bestand door naar de Mining Engine
  const engineForm = new FormData()
  engineForm.append('file', file)
  engineForm.append('tenant_id', user.id)

  let engineResp: Response
  try {
    engineResp = await fetch(`${engineUrl}/logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${engineSecret}` },
      body: engineForm,
    })
  } catch {
    return NextResponse.json({ error: 'Engine niet bereikbaar' }, { status: 503 })
  }

  if (!engineResp.ok) {
    const detail = await engineResp.text()
    return NextResponse.json({ error: `Engine fout: ${detail}` }, { status: 500 })
  }

  const result = await engineResp.json()

  // Sla user_id op bij de job (engine heeft het aangemaakt met tenant_id)
  await supabase
    .from('mining_jobs')
    .update({ user_id: user.id })
    .eq('id', result.job_id)

  return NextResponse.json({ job_id: result.job_id, event_count: result.event_count })
}
