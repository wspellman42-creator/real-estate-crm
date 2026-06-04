import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode, fullName } = await req.json()
  if (!inviteCode?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  // Find company by invite code (case-insensitive)
  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('invite_code', inviteCode.trim())
    .single()

  if (error || !company) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Assign user to company as agent
  await Promise.all([
    supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'agent',
      company_id: company.id,
    }, { onConflict: 'id' }),
    supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'agent',
      company_id: company.id,
    }, { onConflict: 'id' }),
  ])

  return NextResponse.json({ company })
}
