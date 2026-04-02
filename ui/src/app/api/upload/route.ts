import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ENGINE_URL = process.env.MINING_ENGINE_URL
const ENGINE_SECRET = process.env.MINING_ENGINE_SECRET

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Geen bestand meegestuurd' }, { status: 400 })

  const engineForm = new FormData()
  engineForm.append('file', file)
  engineForm.append('tenant_id', user.id)

  let resp: Response
  try {
    resp = await fetch(`${ENGINE_URL}/logs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${ENGINE_SECRET}` },
      body: engineForm,
    })
  } catch {
    return NextResponse.json({ error: 'Verbinding met analyse-engine mislukt.' }, { status: 502 })
  }

  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.detail || 'Upload mislukt bij de analyse-engine.' },
      { status: resp.status }
    )
  }

  return NextResponse.json(await resp.json())
}
