import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const engineFormData = new FormData()
  engineFormData.append('file', file)
  engineFormData.append('tenant_id', user.id)

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  const response = await fetch(`${engineUrl}/logs`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${engineSecret}` },
    body: engineFormData,
  })

  if (!response.ok) {
    const text = await response.text()
    return NextResponse.json({ error: text }, { status: response.status })
  }

  const result = await response.json()

  // Update user_id on the job
  await supabase
    .from('mining_jobs')
    .update({ user_id: user.id, filename: file.name })
    .eq('id', result.job_id)

  return NextResponse.json(result)
}
