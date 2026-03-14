import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { db_url } = body

  if (!db_url) {
    return NextResponse.json({ error: 'db_url is verplicht' }, { status: 400 })
  }

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  const response = await fetch(`${engineUrl}/connectors/flowable/test`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${engineSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ db_url }),
  })

  const data = await response.json()

  if (!response.ok) {
    return NextResponse.json({ error: data.detail || 'Verbinding mislukt' }, { status: 400 })
  }

  return NextResponse.json(data)
}
