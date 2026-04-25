import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const ERR_TENANT_REQUIRED = 'tenant-id is verplicht voor Flowable-sync'
const ERR_TENANT_MISMATCH =
  'X-Tenant-Id header moet gelijk zijn aan flowable_tenant_id voor consistente sourcing.'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { db_url, flowable_tenant_id } = body

  // X-Tenant-Id header is canoniek voor Conductus-integratie. Frontend-flow
  // (zonder Conductus) mag de header weglaten — dan valt hij terug op
  // flowable_tenant_id uit de body.
  const headerTenantId = request.headers.get('x-tenant-id') ?? ''
  const tenantId = (headerTenantId || flowable_tenant_id || '').trim()

  if (!tenantId) {
    return NextResponse.json({ error: ERR_TENANT_REQUIRED }, { status: 400 })
  }

  if (
    headerTenantId &&
    flowable_tenant_id &&
    headerTenantId !== flowable_tenant_id
  ) {
    return NextResponse.json({ error: ERR_TENANT_MISMATCH }, { status: 400 })
  }

  if (!db_url) {
    return NextResponse.json({ error: 'db_url is verplicht' }, { status: 400 })
  }

  // Maak een mining_job aan in Supabase met status "pending" + Conductus-label
  // (label-only, RLS blijft op user_id).
  const { data: job, error: jobError } = await supabase
    .from('mining_jobs')
    .insert({
      user_id: user.id,
      tenant_id: user.id,
      status: 'pending',
      source: 'flowable',
      filename: `flowable:${tenantId}`,
      conductus_tenant_id: headerTenantId || null,
    })
    .select('id')
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Kon job niet aanmaken' }, { status: 500 })
  }

  const job_id = job.id

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  // Stuur naar engine met X-Tenant-Id header (indien aanwezig)
  const engineHeaders: Record<string, string> = {
    Authorization: `Bearer ${engineSecret}`,
    'Content-Type': 'application/json',
  }
  if (headerTenantId) {
    engineHeaders['X-Tenant-Id'] = headerTenantId
  }

  const engineResponse = await fetch(`${engineUrl}/connectors/flowable/sync`, {
    method: 'POST',
    headers: engineHeaders,
    body: JSON.stringify({
      job_id,
      tenant_id: user.id,
      flowable_tenant_id: tenantId,
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
