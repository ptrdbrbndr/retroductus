import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { db_url, flowable_tenant_id } = body

  if (!db_url || !flowable_tenant_id) {
    return NextResponse.json({ error: 'db_url en flowable_tenant_id zijn verplicht' }, { status: 400 })
  }

  // Maak een mining_job aan in Supabase met status "pending"
  const { data: job, error: jobError } = await supabase
    .from('mining_jobs')
    .insert({
      user_id: user.id,
      tenant_id: user.id,
      status: 'pending',
      source: 'flowable',
      filename: `flowable:${flowable_tenant_id}`,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Kon job niet aanmaken' }, { status: 500 })
  }

  const job_id = job.id

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  // Stuur naar engine (fire-and-forget — engine verwerkt asynchroon)
  const engineResponse = await fetch(`${engineUrl}/connectors/flowable/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${engineSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      job_id,
      tenant_id: user.id,
      flowable_tenant_id,
      db_url,
    }),
  })

  if (!engineResponse.ok) {
    const errData = await engineResponse.json().catch(() => ({}))
    await supabase
      .from('mining_jobs')
      .update({ status: 'error', error_message: errData.detail || 'Engine fout' })
      .eq('id', job_id)
    return NextResponse.json({ error: errData.detail || 'Engine fout' }, { status: 500 })
  }

  return NextResponse.json({ job_id })
}
