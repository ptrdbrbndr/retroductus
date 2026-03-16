import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin-check
  const { data: plan } = await supabase
    .from('user_plans')
    .select('is_admin')
    .eq('user_id', user.id)
    .single()

  if (!plan?.is_admin) {
    return NextResponse.json({ error: 'Onvoldoende rechten' }, { status: 403 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('issues')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'Verwijderen mislukt' }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
