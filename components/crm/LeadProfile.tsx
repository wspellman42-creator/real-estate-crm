'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lead, Tag, LeadActivity, SmartPlan } from '@/lib/types'
import { getStatusColor, LEAD_STATUSES, LEAD_TYPES, formatCurrency, formatDate, timeAgo, getInitials } from '@/lib/utils'
import { 
  ArrowLeft, Phone, Mail, MapPin, Edit2, CheckSquare, 
  FileText, Zap, Tag as TagIcon, Clock, Plus, X, Check
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeadProfileProps {
  lead: Lead & { notes: Array<{ id: string; content: string; created_at: string; author?: { full_name: string } }>, tasks: Array<{ id: string; title: string; completed: boolean; due_date?: string }>, active_smart_plans: Array<{ id: string; status: string; smart_plan: SmartPlan }> }
  agents: { id: string; full_name: string }[]
  smartPlans: { id: string; name: string; category?: string }[]
  allTags: Tag[]
  activity: LeadActivity[]
}

type Tab = 'overview' | 'notes' | 'tasks' | 'smart-plans' | 'activity'

export default function LeadProfile({ lead, agents, smartPlans, allTags, activity }: LeadProfileProps) {
  const [tab, setTab] = useState<Tab>('overview')
  const [editing, setEditing] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [editForm, setEditForm] = useState({
    first_name: lead.first_name, last_name: lead.last_name,
    email: lead.email ?? '', phone: lead.phone ?? '',
    status: lead.status, lead_type: lead.lead_type,
    assigned_agent_id: lead.assigned_agent_id ?? '',
    deal_value: lead.deal_value?.toString() ?? '',
  })
  const router = useRouter()
  const supabase = createClient()

  async function saveEdit() {
    await supabase.from('leads').update({
      ...editForm,
      deal_value: editForm.deal_value ? parseFloat(editForm.deal_value) : null,
      assigned_agent_id: editForm.assigned_agent_id || null,
    }).eq('id', lead.id)
    setEditing(false)
    router.refresh()
  }

  async function addNote() {
    if (!noteText.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('lead_notes').insert({ lead_id: lead.id, content: noteText, author_id: user?.id })
    await supabase.from('lead_activity').insert({ lead_id: lead.id, user_id: user?.id, activity_type: 'note', description: 'Added a note' })
    setNoteText('')
    router.refresh()
  }

  async function addTask() {
    if (!taskTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({ lead_id: lead.id, title: taskTitle, due_date: taskDue || null, assigned_to_id: user?.id })
    setTaskTitle('')
    setTaskDue('')
    router.refresh()
  }

  async function toggleTask(taskId: string, completed: boolean) {
    await supabase.from('tasks').update({ completed: !completed, completed_at: !completed ? new Date().toISOString() : null }).eq('id', taskId)
    router.refresh()
  }

  async function enrollSmartPlan(planId: string) {
    await supabase.from('smart_plan_enrollments').upsert({ smart_plan_id: planId, lead_id: lead.id, status: 'active' }, { onConflict: 'smart_plan_id,lead_id' })
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

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'smart-plans', label: 'Smart Plans', icon: Zap },
    { id: 'activity', label: 'Activity', icon: Clock },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/crm" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lead.first_name} {lead.last_name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(lead.status)}`}>{lead.status}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm text-gray-500">{lead.lead_type}</span>
            {lead.deal_value && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(lead.deal_value)}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => editing ? saveEdit() : setEditing(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Edit2 size={14} />
          {editing ? 'Save' : 'Edit'}
        </button>
        {editing && (
          <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column - contact info */}
        <div className="space-y-4">
          {/* Contact card */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold">
                {getInitials(`${lead.first_name} ${lead.last_name}`)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{lead.first_name} {lead.last_name}</p>
                <p className="text-sm text-gray-500">{lead.lead_source || 'Direct'}</p>
              </div>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input value={editForm.first_name} onChange={e => setEditForm(f => ({...f, first_name: e.target.value}))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="First" />
                  <input value={editForm.last_name} onChange={e => setEditForm(f => ({...f, last_name: e.target.value}))}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Last" />
                </div>
                <input value={editForm.email} onChange={e => setEditForm(f => ({...f, email: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Email" />
                <input value={editForm.phone} onChange={e => setEditForm(f => ({...f, phone: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone" />
                <select value={editForm.status} onChange={e => setEditForm(f => ({...f, status: e.target.value as typeof lead.status}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {LEAD_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <select value={editForm.lead_type} onChange={e => setEditForm(f => ({...f, lead_type: e.target.value as typeof lead.lead_type}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {LEAD_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
                <select value={editForm.assigned_agent_id} onChange={e => setEditForm(f => ({...f, assigned_agent_id: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Unassigned</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
                <input type="number" value={editForm.deal_value} onChange={e => setEditForm(f => ({...f, deal_value: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Deal value" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {lead.email && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Mail size={14} className="text-gray-400 flex-shrink-0" />
                    <a href={`mailto:${lead.email}`} className="hover:text-blue-600 transition-colors truncate">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <Phone size={14} className="text-gray-400 flex-shrink-0" />
                    <a href={`tel:${lead.phone}`} className="hover:text-blue-600 transition-colors">{lead.phone}</a>
                  </div>
                )}
                {(lead.address || lead.city) && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate">{[lead.address, lead.city, lead.state].filter(Boolean).join(', ')}</span>
                  </div>
                )}
                <div className="pt-2 space-y-1.5 border-t border-gray-100">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Agent</span>
                    <span className="font-medium text-gray-700">{lead.assigned_agent ? (lead.assigned_agent as { full_name: string }).full_name : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Last Contact</span>
                    <span className="font-medium text-gray-700">{timeAgo(lead.last_contacted_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Added</span>
                    <span className="font-medium text-gray-700">{formatDate(lead.created_at)}</span>
                  </div>
                  {lead.deal_value && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Deal Value</span>
                      <span className="font-medium text-green-600">{formatCurrency(lead.deal_value)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <TagIcon size={14} className="text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Tags</h3>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {currentTags.map(tag => (
                <span key={tag.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                  {tag.name}
                  <button onClick={() => removeTag(tag.id)} className="hover:opacity-70"><X size={10} /></button>
                </span>
              ))}
              {currentTags.length === 0 && <p className="text-xs text-gray-400">No tags</p>}
            </div>
            {availableTags.length > 0 && (
              <select
                onChange={e => { if (e.target.value) { addTag(e.target.value); e.target.value = '' } }}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-500"
              >
                <option value="">+ Add tag</option>
                {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          </div>
        </div>

        {/* Right column - tabs */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === id ? 'text-blue-600 border-blue-600' : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {/* Notes tab */}
            {tab === 'notes' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Add a note..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
                  />
                </div>
                <button onClick={addNote} disabled={!noteText.trim()}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                  Add Note
                </button>
                <div className="space-y-3 mt-4">
                  {lead.notes?.map((note) => (
                    <div key={note.id} className="border border-gray-100 rounded-lg p-3">
                      <p className="text-sm text-gray-700">{note.content}</p>
                      <p className="text-xs text-gray-400 mt-1.5">{note.author?.full_name ?? 'Unknown'} · {timeAgo(note.created_at)}</p>
                    </div>
                  ))}
                  {(!lead.notes || lead.notes.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-8">No notes yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Tasks tab */}
            {tab === 'tasks' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Task title..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={addTask} disabled={!taskTitle.trim()}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2">
                  {lead.tasks?.map((task) => (
                    <div key={task.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                      <button
                        onClick={() => toggleTask(task.id, task.completed)}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-2 border-gray-300 hover:border-blue-500'}`}
                      >
                        {task.completed && <Check size={12} className="text-white" />}
                      </button>
                      <span className={`text-sm flex-1 ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</span>
                      {task.due_date && (
                        <span className="text-xs text-gray-400">{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  ))}
                  {(!lead.tasks || lead.tasks.length === 0) && (
                    <p className="text-sm text-gray-400 text-center py-8">No tasks yet</p>
                  )}
                </div>
              </div>
            )}

            {/* Smart Plans tab */}
            {tab === 'smart-plans' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Active Smart Plans</h3>
                  <div className="space-y-2">
                    {lead.active_smart_plans?.map((enrollment) => (
                      <div key={enrollment.id} className="flex items-center gap-3 p-3 rounded-lg border border-purple-100 bg-purple-50">
                        <Zap size={14} className="text-purple-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">{enrollment.smart_plan?.name}</p>
                          <p className="text-xs text-gray-500">Step {enrollment.current_step} · {enrollment.status}</p>
                        </div>
                        <button onClick={() => removeEnrollment(enrollment.id)} className="p-1 hover:bg-purple-100 rounded text-purple-400 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    {(!lead.active_smart_plans || lead.active_smart_plans.length === 0) && (
                      <p className="text-sm text-gray-400">No active Smart Plans</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assign Smart Plan</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {smartPlans
                      .filter(p => !lead.active_smart_plans?.some(e => e.smart_plan_id === p.id && e.status === 'active'))
                      .map(plan => (
                        <button key={plan.id} onClick={() => enrollSmartPlan(plan.id)}
                          className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group">
                          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Zap size={14} className="text-purple-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate">{plan.name}</p>
                            {plan.category && <p className="text-xs text-gray-400">{plan.category}</p>}
                          </div>
                          <Plus size={14} className="ml-auto text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Activity tab */}
            {tab === 'activity' && (
              <div className="space-y-3">
                {activity.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm text-gray-700">{item.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.user ? (item.user as { full_name: string }).full_name : 'System'} · {timeAgo(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
                {activity.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-8">No activity yet</p>
                )}
              </div>
            )}

            {/* Overview tab */}
            {tab === 'overview' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>{lead.status}</span>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Type</p>
                    <p className="text-sm font-medium text-gray-700">{lead.lead_type}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Pipeline Stage</p>
                    <p className="text-sm font-medium text-gray-700">{lead.pipeline_stage ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Source</p>
                    <p className="text-sm font-medium text-gray-700">{lead.lead_source ?? '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Deal Value</p>
                    <p className="text-sm font-medium text-green-600">{formatCurrency(lead.deal_value ?? undefined)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Expected Close</p>
                    <p className="text-sm font-medium text-gray-700">{formatDate(lead.expected_close_date ?? undefined)}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Active Smart Plans</h3>
                  {lead.active_smart_plans?.filter(e => e.status === 'active').length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {lead.active_smart_plans?.filter(e => e.status === 'active').map(e => (
                        <span key={e.id} className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                          {e.smart_plan?.name}
                        </span>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-400">None</p>}
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Notes</h3>
                  {lead.notes?.slice(0, 2).map(note => (
                    <div key={note.id} className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 mb-2">
                      {note.content}
                    </div>
                  ))}
                  {(!lead.notes || lead.notes.length === 0) && <p className="text-sm text-gray-400">None</p>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
