import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { email, password, full_name, role } = await req.json()

  if (!email || !password || !full_name) {
    return NextResponse.json({ error: 'Email, password, and full name are required' }, { status: 400 })
  }

  const { data, error } = await supabase.rpc('create_user_account', {
    p_email: email,
    p_password: password,
    p_full_name: full_name,
    p_role: role ?? 'agent',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ success: true, ...data })
}
