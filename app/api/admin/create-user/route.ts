import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verify the caller is an admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (caller?.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const { email, password, full_name, role } = await req.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Create the auth user
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role: role ?? 'agent' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

  const id = authUser.user.id

  // Insert into public.users (used by all lead FK references)
  const { error: usersError } = await admin.from('users').insert({
    id,
    email,
    full_name,
    role: role ?? 'agent',
  })

  if (usersError) {
    // Roll back the auth user if public.users insert fails
    await admin.auth.admin.deleteUser(id)
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, id })
}
