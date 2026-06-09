import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')?.trim()
  if (!code) return NextResponse.json({ valid: false }, { status: 400 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('companies')
    .select('name')
    .ilike('invite_code', code)
    .single()

  if (!data) return NextResponse.json({ valid: false }, { status: 404 })
  return NextResponse.json({ valid: true, companyName: data.name })
}
