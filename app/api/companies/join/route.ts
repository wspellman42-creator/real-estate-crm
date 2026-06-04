import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { inviteCode, fullName } = await req.json()
  if (!inviteCode?.trim()) return NextResponse.json({ error: 'Invite code required' }, { status: 400 })

  // Find company by invite code (admin client — user has no company_id yet)
  const { data: company, error } = await admin
    .from('companies')
    .select('id, name')
    .ilike('invite_code', inviteCode.trim())
    .single()

  if (error || !company) return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })

  // Assign user to company as agent (admin client bypasses RLS)
  await Promise.all([
    admin.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'agent',
      company_id: company.id,
    }, { onConflict: 'id' }),
    admin.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'agent',
      company_id: company.id,
    }, { onConflict: 'id' }),
  ])

  return NextResponse.json({ company })
}
