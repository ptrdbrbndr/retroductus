import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'Ophalen mislukt' }, { status: 500 })
  }

  return NextResponse.json({ issues: data })
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { category, priority, title, description, reporter_name, reporter_email, page_url } = body

  if (!category || !title || !description) {
    return NextResponse.json({ error: 'Categorie, titel en omschrijving zijn verplicht' }, { status: 400 })
  }

  const ALLOWED_CATEGORIES = ['bug', 'inhoud', 'technisch', 'toegang', 'suggestie', 'overig']
  const ALLOWED_PRIORITIES = ['laag', 'normaal', 'hoog', 'kritiek']

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return NextResponse.json({ error: 'Ongeldige categorie' }, { status: 400 })
  }
  if (priority && !ALLOWED_PRIORITIES.includes(priority)) {
    return NextResponse.json({ error: 'Ongeldige prioriteit' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('issues')
    .insert({
      reporter_user_id: user.id,
      reporter_name: reporter_name || null,
      reporter_email: reporter_email || null,
      page_url: page_url || null,
      category,
      priority: priority || 'normaal',
      title: title.trim(),
      description: description.trim(),
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'Aanmaken mislukt' }, { status: 500 })
  }

  return NextResponse.json({ issue: data }, { status: 201 })
}
