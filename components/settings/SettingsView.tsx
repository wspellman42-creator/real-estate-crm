'use client'

import { useState } from 'react'
import { Profile, Tag } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Users, Tag as TagIcon, Plus, Trash2, X } from 'lucide-react'

interface SettingsViewProps {
  profile: Profile | null
  agents: Profile[]
  tags: Tag[]
}

type Tab = 'profile' | 'team' | 'tags'

export default function SettingsView({ profile, agents, tags }: SettingsViewProps) {
  const [tab, setTab] = useState<Tab>('profile')
  const [profileForm, setProfileForm] = useState({ full_name: profile?.full_name ?? '', email: profile?.email ?? '' })
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6366F1')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function saveProfile() {
    setSaving(true)
    await supabase.from('profiles').update({ full_name: profileForm.full_name }).eq('id', profile?.id ?? '')
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    router.refresh()
  }

  async function addTag() {
    if (!newTagName.trim()) return
    await supabase.from('tags').insert({ name: newTagName, color: newTagColor })
    setNewTagName('')
    router.refresh()
  }

  async function deleteTag(id: string) {
    await supabase.from('tags').delete().eq('id', id)
    router.refresh()
  }

  const tabs = [
    { id: 'profile' as Tab, label: 'My Profile', icon: User },
    { id: 'team' as Tab, label: 'Team', icon: Users },
    { id: 'tags' as Tab, label: 'Tags', icon: TagIcon },
  ]

  const PRESET_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1', '#22C55E', '#F97316']

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Tab bar */}
      <div className="flex border-b border-gray-100">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              tab === id ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Profile Information</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                value={profileForm.full_name}
                onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                value={profileForm.email}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
              <input
                value={profile?.role ?? 'agent'}
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-500 capitalize"
              />
            </div>

            <button
              onClick={saveProfile}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
            >
              {saved ? '✓ Saved!' : saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Team tab */}
        {tab === 'team' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Team Members</h2>
              <span className="text-sm text-gray-500">{agents.length} members</span>
            </div>

            <div className="space-y-2">
              {agents.map(agent => (
                <div key={agent.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                    {agent.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{agent.full_name}</p>
                    <p className="text-xs text-gray-500">{agent.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${
                    agent.role === 'admin' ? 'bg-red-100 text-red-700' :
                    agent.role === 'agent' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {agent.role}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm font-medium text-blue-800">Invite Team Members</p>
              <p className="text-xs text-blue-600 mt-1">New users can register at the login page. Their profile will be created automatically with the &apos;agent&apos; role.</p>
            </div>
          </div>
        )}

        {/* Tags tab */}
        {tab === 'tags' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Manage Tags</h2>

            {/* Add new tag */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Create New Tag</h3>
              <div className="flex gap-2 mb-3">
                <input
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTag()}
                  placeholder="Tag name..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addTag}
                  disabled={!newTagName.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Plus size={15} />
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className={`w-6 h-6 rounded-full transition-transform ${newTagColor === color ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              {newTagName && (
                <div className="mt-3">
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: newTagColor + '20', color: newTagColor }}>
                    Preview: {newTagName}
                  </span>
                </div>
              )}
            </div>

            {/* Tags list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 group">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }}></div>
                  <span
                    className="text-sm font-medium flex-1 px-2.5 py-0.5 rounded-full w-fit"
                    style={{ backgroundColor: tag.color + '20', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => deleteTag(tag.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all rounded"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
