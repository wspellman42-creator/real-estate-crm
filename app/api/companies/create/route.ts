import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { companyName, fullName } = await req.json()
  if (!companyName?.trim()) return NextResponse.json({ error: 'Company name required' }, { status: 400 })

  // Check user doesn't already have a company
  const { data: profile } = await admin.from('profiles').select('company_id').eq('id', user.id).single()
  if (profile?.company_id) return NextResponse.json({ error: 'Already in a company' }, { status: 400 })

  // Create company (use admin client to bypass RLS — user has no company_id yet)
  const { data: company, error: companyErr } = await admin
    .from('companies')
    .insert({ name: companyName.trim() })
    .select()
    .single()
  if (companyErr) return NextResponse.json({ error: companyErr.message }, { status: 500 })

  // Update profiles and users with company_id, full_name, and admin role (admin client bypasses RLS)
  await Promise.all([
    admin.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'admin',
      company_id: company.id,
    }, { onConflict: 'id' }),
    admin.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName?.trim() || user.email,
      role: 'admin',
      company_id: company.id,
    }, { onConflict: 'id' }),
  ])

  return NextResponse.json({ company })
}
