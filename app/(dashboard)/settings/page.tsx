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
  const { data: company } = await supabase.from('companies').select('id, name, invite_code').single()

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your account and team settings</p>
      </div>
      {company && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Company</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{company.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Company name</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-medium mb-0.5">Agent Invite Code</p>
                <p className="text-lg font-mono font-bold text-blue-800 tracking-widest">{company.invite_code}</p>
                <p className="text-xs text-blue-500 mt-0.5">Share this with agents — they go to <strong>/join</strong> and enter this code</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <SettingsView
        profile={profile}
        agents={agents ?? []}
        tags={tags ?? []}
        isAdmin={currentUser?.role === 'admin'}
      />
    </div>
  )
}
