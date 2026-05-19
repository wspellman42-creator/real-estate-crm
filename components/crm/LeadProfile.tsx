'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lead, Tag, LeadActivity, SmartPlan } from '@/lib/types'
import { getStatusColor, getStageColor, LEAD_STATUSES, LEAD_TYPES, LEAD_SOURCES, PIPELINE_STAGES, formatCurrency, formatDate, timeAgo, getInitials } from '@/lib/utils'
import {
  ArrowLeft, Phone, Mail, MapPin, Edit2, CheckSquare,
  FileText, Zap, Tag as TagIcon, Clock, Plus, X, Check,
  DollarSign, Calendar, User, Save, Building2, StickyNote
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeadProfileProps {
  lead: Lead & {
    notes: Array<{ id: string; content: string; created_at: string; author?: { full_name: string } }>
    tasks: Array<{ id: string; title: string; completed: boolean; due_date?: string; assigned_to?: { full_name: string } }>
    active_smart_plans: Array<{ id: string; status: string; current_step?: number; smart_plan: SmartPlan }>
  }
  agents: { id: string; full_name: string }[]
  smartPlans: { id: string; name: string; category?: string }[]
  allTags: Tag[]
  activity: LeadActivity[]
}

type Tab = 'overview' | 'notes' | 'tasks' | 'smart-plans' | 'activity'

export default function LeadProfile({ lead, agents, smartPlans, allTags, activity }: LeadProfileProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [editForm, setEditForm] = useState({
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    address: lead.address ?? '',
    city: lead.city ?? '',
    state: lead.state ?? '',
    zip: lead.zip ?? '',
    lead_type: lead.lead_type,
    lead_source: lead.lead_source ?? '',
    status: lead.status,
    pipeline_stage: lead.pipeline_stage ?? 'New Lead',
    assigned_agent_id: lead.assigned_agent_id ?? '',
    deal_value: lead.deal_value?.toString() ?? '',
    expected_close_date: lead.expected_close_date ?? '',
  })
  const router = useRouter()
  const supabase = createClient()

  function field(f: Partial<typeof editForm>) {
    setEditForm(prev => ({ ...prev, ...f }))
  }

  async function saveEdit() {
    setSaving(true)
    const { error } = await supabase.from('leads').update({
      ...editForm,
      deal_value: editForm.deal_value ? parseFloat(editForm.deal_value) : null,
      assigned_agent_id: editForm.assigned_agent_id || null,
      expected_close_date: editForm.expected_close_date || null,
    }).eq('id', lead.id)
    setSaving(false)
    if (!error) {
      setEditing(false)
      router.refresh()
    }
  }

  async function addNote() {
    if (!noteText.trim()) return
    setAddingNote(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('lead_notes').insert({ lead_id: lead.id, content: noteText, author_id: user?.id })
    await supabase.from('lead_activity').insert({
      lead_id: lead.id, user_id: user?.id,
      activity_type: 'note', description: 'Added a note'
    })
    setNoteText('')
    setAddingNote(false)
    router.refresh()
  }

  async function addTask() {
    if (!taskTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      lead_id: lead.id, title: taskTitle,
      due_date: taskDue || null, assigned_to_id: user?.id,
      created_by_id: user?.id
    })
    setTaskTitle('')
    setTaskDue('')
    router.refresh()
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await supabase.from('tasks').update({
      completed: !completed,
      completed_at: !completed ? new Date().toISOString() : null
    }).eq('id', taskId)
    router.refresh()
  }

  async function enrollSmartPlan(planId: string) {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('smart_plan_enrollments').upsert(
      { smart_plan_id: planId, lead_id: lead.id, status: 'active', enrolled_by_id: user?.id },
      { onConflict: 'smart_plan_id,lead_id' }
    )
    router.refresh()
  }

  async function removeEnrollment(enrollmentId: string) {
    await supabase.from('smart_plan_enrollments').delete().eq('id', enrollmentId)
    router.refresh()
  }

  async function addTag(tagId: string) {
    await supabase.from('lead_tags').upsert({ lead_id: lead.id, tag_id: tagId })
    router.refresh()
  }

  async function removeTag(tagId: string) {
    await supabase.from('lead_tags').delete().eq('lead_id', lead.id).eq('tag_id', tagId)
    router.refresh()
  }

  const currentTags = (lead.tags ?? []) as Tag[]
  const tagIds = currentTags.map(t => t.id)
  const availableTags = allTags.filter(t => !tagIds.includes(t.id))
  const agentName = lead.assigned_agent ? (lead.assigned_agent as { full_name: string }).full_name : null

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  const tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'notes', label: 'Notes', icon: StickyNote, count: lead.notes?.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: lead.tasks?.filter(t => !t.completed).length },
    { id: 'smart-plans', label: 'Smart Plans', icon: Zap },
    { id: 'activity', label: 'Activity', icon: Clock },
  ]

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/crm" className="mt-1 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>
              {lead.status}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
            <span>{lead.lead_type}</span>
            {lead.pipeline_stage && (
              <>
                <span className="text-gray-300">·</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: getStageColor(lead.pipeline_stage as Parameters<typeof getStageColor>[0]) }} />
                  {lead.pipeline_stage}
                </span>
              </>
            )}
            {lead.deal_value && (
              <>
                <span className="text-gray-300">·</span>
                <span className="font-semibold text-green-600">{formatCurrency(lead.deal_value)}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </>
          ) : (
            <button onClick={() => { setEditing(true); setTab('overview') }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
              <Edit2 size={14} />
              Edit Lead
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left sidebar */}
        <div className="space-y-4">
          {/* Contact card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-base font-bold flex-shrink-0">
                {getInitials(`${lead.first_name} ${lead.last_name}`)}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                <p className="text-xs text-gray-400">{lead.lead_source || 'No source'}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              {lead.email ? (
                <a href={`mailto:${lead.email}`}
                  className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors group">
                  <div className="w-7 h-7 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
                    <Mail size={13} className="text-blue-500" />
                  </div>
                  <span className="truncate">{lead.email}</span>
                </a>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail size={13} className="text-gray-300" />
                  </div>
                  <span>No email</span>
                </div>
              )}

              {lead.phone ? (
                <a href={`tel:${lead.phone}`}
                  className="flex items-center gap-2.5 text-sm text-gray-600 hover:text-blue-600 transition-colors group">
                  <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-green-100">
                    <Phone size={13} className="text-green-500" />
                  </div>
                  <span>{lead.phone}</span>
                </a>
              ) : (
                <div className="flex items-center gap-2.5 text-sm text-gray-400">
                  <div className="w-7 h-7 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone size={13} className="text-gray-300" />
                  </div>
                  <span>No phone</span>
                </div>
              )}

              {(lead.address || lead.city) && (
                <div className="flex items-start gap-2.5 text-sm text-gray-600">
                  <div className="w-7 h-7 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin size={13} className="text-orange-500" />
                  </div>
                  <span className="leading-relaxed">
                    {[lead.address, lead.city, lead.state, lead.zip].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <User size={12} />
                  <span>Agent</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{agentName ?? 'Unassigned'}</span>
              </div>
              {lead.deal_value && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <DollarSign size={12} />
                    <span>Deal Value</span>
                  </div>
                  <span className="text-xs font-semibold text-green-600">{formatCurrency(lead.deal_value)}</span>
                </div>
              )}
              {lead.expected_close_date && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar size={12} />
                    <span>Expected Close</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">{formatDate(lead.expected_close_date)}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>Last Contact</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{timeAgo(lead.last_contacted_at)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Building2 size={12} />
                  <span>Added</span>
                </div>
                <span className="text-xs font-medium text-gray-700">{formatDate(lead.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {currentTags.map(tag => (
                <span key={tag.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                  {tag.name}
                  <button onClick={() => removeTag(tag.id)} className="hover:opacity-70 ml-0.5">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {currentTags.length === 0 && <p className="text-xs text-gray-400">No tags added</p>}
            </div>
            {availableTags.length > 0 && (
              <select
                onChange={e => { if (e.target.value) { addTag(e.target.value); e.target.value = '' } }}
                className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500 bg-gray-50">
                <option value="">+ Add tag…</option>
                {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{lead.notes?.length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Notes</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{lead.tasks?.filter(t => !t.completed).length ?? 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Open Tasks</p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 flex flex-col min-h-[600px]">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto flex-shrink-0">
            {tabs.map(({ id, label, icon: Icon, count }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  tab === id ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-200'
                }`}>
                <Icon size={14} />
                {label}
                {count !== undefined && count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                    tab === id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 flex-1">

            {/* OVERVIEW TAB */}
            {tab === 'overview' && !editing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Status', value: <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>{lead.status}</span> },
                      { label: 'Type', value: lead.lead_type },
                      { label: 'Pipeline Stage', value: lead.pipeline_stage ?? '—' },
                      { label: 'Lead Source', value: lead.lead_source ?? '—' },
                      { label: 'Deal Value', value: <span className="text-green-600 font-semibold">{formatCurrency(lead.deal_value ?? undefined)}</span> },
                      { label: 'Expected Close', value: formatDate(lead.expected_close_date ?? undefined) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">{label}</p>
                        <div className="text-sm font-medium text-gray-800">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {lead.active_smart_plans?.filter(e => e.status === 'active').length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Active Smart Plans</h3>
                    <div className="flex flex-wrap gap-2">
                      {lead.active_smart_plans.filter(e => e.status === 'active').map(e => (
                        <span key={e.id} className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                          <Zap size={10} />
                          {e.smart_plan?.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent notes preview */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-900">Recent Notes</h3>
                    <button onClick={() => setTab('notes')} className="text-xs text-blue-600 hover:underline">
                      View all
                    </button>
                  </div>
                  {lead.notes && lead.notes.length > 0 ? (
                    <div className="space-y-2">
                      {lead.notes.slice(0, 3).map(note => (
                        <div key={note.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {note.author?.full_name ?? 'Unknown'} · {timeAgo(note.created_at)}
                          </p>
                        </div>
                      ))}
                      {lead.notes.length > 3 && (
                        <button onClick={() => setTab('notes')} className="text-xs text-gray-400 hover:text-blue-600 transition-colors">
                          + {lead.notes.length - 3} more notes
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                      <StickyNote size={20} className="text-gray-300 mx-auto mb-1.5" />
                      <p className="text-sm text-gray-400">No notes yet</p>
                      <button onClick={() => setTab('notes')} className="text-xs text-blue-600 hover:underline mt-1">Add first note</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* EDIT FORM */}
            {tab === 'overview' && editing && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>First Name</label>
                      <input value={editForm.first_name} onChange={e => field({ first_name: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Last Name</label>
                      <input value={editForm.last_name} onChange={e => field({ last_name: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Email</label>
                      <input type="email" value={editForm.email} onChange={e => field({ email: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Phone</label>
                      <input value={editForm.phone} onChange={e => field({ phone: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Address</h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelCls}>Street Address</label>
                      <input value={editForm.address} onChange={e => field({ address: e.target.value })} className={inputCls} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className={labelCls}>City</label>
                        <input value={editForm.city} onChange={e => field({ city: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>State</label>
                        <input value={editForm.state} onChange={e => field({ state: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Zip</label>
                        <input value={editForm.zip} onChange={e => field({ zip: e.target.value })} className={inputCls} />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Lead Type</label>
                      <select value={editForm.lead_type} onChange={e => field({ lead_type: e.target.value as typeof lead.lead_type })} className={inputCls}>
                        {LEAD_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Lead Source</label>
                      <select value={editForm.lead_source} onChange={e => field({ lead_source: e.target.value })} className={inputCls}>
                        <option value="">Select source</option>
                        {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={editForm.status} onChange={e => field({ status: e.target.value as typeof lead.status })} className={inputCls}>
                        {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Pipeline Stage</label>
                      <select value={editForm.pipeline_stage} onChange={e => field({ pipeline_stage: e.target.value })} className={inputCls}>
                        {PIPELINE_STAGES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Deal Value ($)</label>
                      <input type="number" value={editForm.deal_value} onChange={e => field({ deal_value: e.target.value })} placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Expected Close Date</label>
                      <input type="date" value={editForm.expected_close_date} onChange={e => field({ expected_close_date: e.target.value })} className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Assigned Agent</label>
                      <select value={editForm.assigned_agent_id} onChange={e => field({ assigned_agent_id: e.target.value })} className={inputCls}>
                        <option value="">Unassigned</option>
                        {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2 border-t border-gray-100">
                  <button onClick={() => setEditing(false)}
                    className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveEdit} disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* NOTES TAB */}
            {tab === 'notes' && (
              <div className="space-y-4">
                {/* Note composer */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">New Note</p>
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Write a note about this lead…"
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white"
                  />
                  <div className="flex justify-end mt-2">
                    <button onClick={addNote} disabled={!noteText.trim() || addingNote}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium">
                      <Plus size={14} />
                      {addingNote ? 'Adding…' : 'Add Note'}
                    </button>
                  </div>
                </div>

                {/* Notes list */}
                <div className="space-y-3">
                  {lead.notes && lead.notes.length > 0 ? (
                    lead.notes.map((note, i) => (
                      <div key={note.id} className="group relative">
                        <div className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                              {note.author?.full_name ? getInitials(note.author.full_name) : '?'}
                            </div>
                            {i < lead.notes.length - 1 && (
                              <div className="w-px flex-1 bg-gray-100 mt-1 min-h-4" />
                            )}
                          </div>
                          <div className="flex-1 pb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-gray-700">
                                {note.author?.full_name ?? 'Unknown'}
                              </span>
                              <span className="text-xs text-gray-400">{timeAgo(note.created_at)}</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm">
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <StickyNote size={32} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No notes yet</p>
                      <p className="text-gray-300 text-xs mt-1">Add the first note above</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TASKS TAB */}
            {tab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                    placeholder="New task…"
                    onKeyDown={e => e.key === 'Enter' && addTask()}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={addTask} disabled={!taskTitle.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>

                <div className="space-y-2">
                  {lead.tasks && lead.tasks.length > 0 ? (
                    <>
                      {lead.tasks.filter(t => !t.completed).map(task => (
                        <div key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                          <button onClick={() => toggleTask(task.id, task.completed)}
                            className="w-5 h-5 rounded border-2 border-gray-300 hover:border-blue-500 flex items-center justify-center flex-shrink-0 transition-colors" />
                          <span className="text-sm text-gray-700 flex-1">{task.title}</span>
                          {task.due_date && (
                            <span className="text-xs text-gray-400">
                              {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                      ))}
                      {lead.tasks.filter(t => t.completed).length > 0 && (
                        <>
                          <p className="text-xs text-gray-400 pt-2 pb-1">Completed</p>
                          {lead.tasks.filter(t => t.completed).map(task => (
                            <div key={task.id}
                              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 opacity-60">
                              <button onClick={() => toggleTask(task.id, task.completed)}
                                className="w-5 h-5 rounded bg-green-500 border-green-500 flex items-center justify-center flex-shrink-0">
                                <Check size={11} className="text-white" />
                              </button>
                              <span className="text-sm text-gray-400 line-through flex-1">{task.title}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12">
                      <CheckSquare size={32} className="text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm font-medium">No tasks yet</p>
                      <p className="text-gray-300 text-xs mt-1">Add a task above to get started</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SMART PLANS TAB */}
            {tab === 'smart-plans' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Active Plans</h3>
                  {lead.active_smart_plans && lead.active_smart_plans.length > 0 ? (
                    <div className="space-y-2">
                      {lead.active_smart_plans.map(enrollment => (
                        <div key={enrollment.id}
                          className="flex items-center gap-3 p-3.5 rounded-lg border border-purple-100 bg-purple-50">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap size={14} className="text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800">{enrollment.smart_plan?.name}</p>
                            <p className="text-xs text-gray-500">Step {enrollment.current_step ?? 0} · {enrollment.status}</p>
                          </div>
                          <button onClick={() => removeEnrollment(enrollment.id)}
                            className="p-1.5 hover:bg-red-100 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 py-2">No active Smart Plans</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Assign a Smart Plan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {smartPlans
                      .filter(p => !lead.active_smart_plans?.some(e => (e.smart_plan as { id: string })?.id === p.id && e.status === 'active'))
                      .map(plan => (
                        <button key={plan.id} onClick={() => enrollSmartPlan(plan.id)}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap size={14} className="text-purple-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate">{plan.name}</p>
                            {plan.category && <p className="text-xs text-gray-400">{plan.category}</p>}
                          </div>
                          <Plus size={14} className="text-gray-300 group-hover:text-blue-500 flex-shrink-0" />
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* ACTIVITY TAB */}
            {tab === 'activity' && (
              <div className="space-y-1">
                {activity.length > 0 ? (
                  activity.map((item, i) => (
                    <div key={item.id} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 flex-shrink-0" />
                        {i < activity.length - 1 && <div className="w-px flex-1 bg-gray-100 mt-1" />}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm text-gray-700">{item.description}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.user ? (item.user as { full_name: string }).full_name : 'System'} · {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Clock size={32} className="text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-400 text-sm font-medium">No activity yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
