import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsView from '@/components/settings/SettingsView'

export default async function SettingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id ?? '').single()
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  if (currentUser?.role !== 'admin') redirect('/crm')
  const { data: agents } = await supabase.from('users').select('*').order('full_name')
  const { data: tags } = await supabase.from('tags').select('*').order('name')

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account and team settings</p>
      </div>
      <SettingsView
        profile={profile}
        agents={agents ?? []}
        tags={tags ?? []}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  )
}
