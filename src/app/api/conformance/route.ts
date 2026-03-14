import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const engineUrl = process.env.MINING_ENGINE_URL
  const engineSecret = process.env.MINING_ENGINE_SECRET

  if (!engineUrl || !engineSecret) {
    return new Response('Engine niet geconfigureerd', { status: 503 })
  }

  // Forward form data (job_id + optional bpmn_file)
  const formData = await req.formData()

  const upstream = await fetch(`${engineUrl}/conformance/check`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${engineSecret}`,
    },
    body: formData,
  })

  const data = await upstream.json().catch(() => ({}))
  return Response.json(data, { status: upstream.status })
}
