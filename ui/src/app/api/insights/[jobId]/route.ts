import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ENGINE_URL = process.env.MINING_ENGINE_URL
const ENGINE_SECRET = process.env.MINING_ENGINE_SECRET

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  // Ownership check — gebruiker mag alleen eigen jobs opvragen
  const { data: job } = await supabase
    .from('mining_jobs')
    .select('id')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (!job) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  let engineResp: Response
  try {
    engineResp = await fetch(`${ENGINE_URL}/insights/ai`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ENGINE_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ job_id: jobId }),
    })
  } catch {
    return NextResponse.json({ error: 'Verbinding met AI-service mislukt.' }, { status: 502 })
  }

  if (!engineResp.ok) {
    const body = await engineResp.json().catch(() => ({}))
    return NextResponse.json(
      { error: body.detail || 'AI-inzichten ophalen mislukt.' },
      { status: engineResp.status }
    )
  }

  return new NextResponse(engineResp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
