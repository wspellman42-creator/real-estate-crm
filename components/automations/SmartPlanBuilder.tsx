'use client'

import { useState } from 'react'
import { SmartPlan, SmartPlanStep, StepType } from '@/lib/types'
import { ArrowLeft, Plus, Trash2, GripVertical, Mail, MessageSquare, CheckSquare, Clock, Tag, AlertCircle, User, FileText, Globe, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SmartPlanBuilderProps {
  plan?: SmartPlan | null
  onClose: () => void
}

const STEP_TYPES: { type: StepType; label: string; icon: React.ElementType; color: string; description: string }[] = [
  { type: 'send_email', label: 'Send Email', icon: Mail, color: 'text-blue-600 bg-blue-50', description: 'Send an automated email' },
  { type: 'send_sms', label: 'Send SMS', icon: MessageSquare, color: 'text-green-600 bg-green-50', description: 'Send an SMS message (placeholder)' },
  { type: 'create_task', label: 'Create Task', icon: CheckSquare, color: 'text-orange-600 bg-orange-50', description: 'Create a follow-up task' },
  { type: 'wait', label: 'Wait / Delay', icon: Clock, color: 'text-gray-600 bg-gray-100', description: 'Pause workflow for X days' },
  { type: 'add_tag', label: 'Add Tag', icon: Tag, color: 'text-purple-600 bg-purple-50', description: 'Add a tag to the lead' },
  { type: 'remove_tag', label: 'Remove Tag', icon: Tag, color: 'text-red-600 bg-red-50', description: 'Remove a tag from the lead' },
  { type: 'change_status', label: 'Change Status', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50', description: 'Update lead status' },
  { type: 'internal_notification', label: 'Internal Notification', icon: AlertCircle, color: 'text-pink-600 bg-pink-50', description: 'Notify team member' },
  { type: 'assign_user', label: 'Assign User', icon: User, color: 'text-indigo-600 bg-indigo-50', description: 'Assign lead to an agent' },
  { type: 'add_note', label: 'Add Note', icon: FileText, color: 'text-teal-600 bg-teal-50', description: 'Add an automated note' },
  { type: 'webhook', label: 'Webhook', icon: Globe, color: 'text-gray-600 bg-gray-100', description: 'Send data to external URL (placeholder)' },
]

const TRIGGER_TYPES = [
  { value: 'manual', label: 'Manual Assignment', description: 'Manually assign to contacts' },
  { value: 'new_lead', label: 'New Lead Created', description: 'Auto-start when a lead is added' },
  { value: 'status_changed', label: 'Lead Status Changed', description: 'Start when status updates' },
  { value: 'tag_added', label: 'Tag Added', description: 'Start when a specific tag is added' },
  { value: 'no_contact', label: 'No Contact After X Days', description: 'Re-engage stale leads' },
]

interface BuilderStep {
  id: string
  step_type: StepType
  name: string
  step_order: number
  config: Record<string, unknown>
}

export default function SmartPlanBuilder({ plan, onClose }: SmartPlanBuilderProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [showStepPicker, setShowStepPicker] = useState(false)

  const [form, setForm] = useState({
    name: plan?.name ?? '',
    description: plan?.description ?? '',
    category: plan?.category ?? '',
    trigger_type: plan?.trigger_type ?? 'manual',
    is_active: plan?.is_active ?? true,
  })

  const [steps, setSteps] = useState<BuilderStep[]>(
    (plan?.steps ?? []).map((s, i) => ({
      id: s.id ?? crypto.randomUUID(),
      step_type: s.step_type as StepType,
      name: s.name,
      step_order: s.step_order ?? i + 1,
      config: (s.config ?? {}) as Record<string, unknown>,
    }))
  )

  function addStep(type: StepType) {
    const typeInfo = STEP_TYPES.find(t => t.type === type)!
    const newStep: BuilderStep = {
      id: crypto.randomUUID(),
      step_type: type,
      name: typeInfo.label,
      step_order: steps.length + 1,
      config: getDefaultConfig(type),
    }
    setSteps(prev => [...prev, newStep])
    setShowStepPicker(false)
  }

  function getDefaultConfig(type: StepType): Record<string, unknown> {
    switch (type) {
      case 'send_email': return { subject: '', template: '' }
      case 'send_sms': return { message: '' }
      case 'create_task': return { title: '', due_offset_hours: 24 }
      case 'wait': return { days: 1 }
      case 'add_tag': return { tag: '' }
      case 'remove_tag': return { tag: '' }
      case 'change_status': return { new_status: 'Active' }
      case 'internal_notification': return { message: '' }
      case 'assign_user': return { user_id: '' }
      case 'add_note': return { content: '' }
      case 'webhook': return { url: '', method: 'POST' }
      default: return {}
    }
  }

  function updateStep(id: string, field: string, value: unknown) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  function updateStepConfig(id: string, key: string, value: unknown) {
    setSteps(prev => prev.map(s => s.id === id ? { ...s, config: { ...s.config, [key]: value } } : s))
  }

  function removeStep(id: string) {
    setSteps(prev => prev.filter(s => s.id !== id).map((s, i) => ({ ...s, step_order: i + 1 })))
  }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)

    if (plan?.id) {
      // Update existing plan
      await supabase.from('smart_plans').update({ ...form }).eq('id', plan.id)
      // Delete old steps and re-insert
      await supabase.from('smart_plan_steps').delete().eq('smart_plan_id', plan.id)
      if (steps.length > 0) {
        await supabase.from('smart_plan_steps').insert(
          steps.map((s, i) => ({
            smart_plan_id: plan.id,
            step_order: i + 1,
            step_type: s.step_type,
            name: s.name,
            config: s.config,
          }))
        )
      }
    } else {
      // Create new plan
      const { data: newPlan } = await supabase.from('smart_plans').insert({ ...form }).select().single()
      if (newPlan && steps.length > 0) {
        await supabase.from('smart_plan_steps').insert(
          steps.map((s, i) => ({
            smart_plan_id: newPlan.id,
            step_order: i + 1,
            step_type: s.step_type,
            name: s.name,
            config: s.config,
          }))
        )
      }
    }

    setSaving(false)
    onClose()
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{plan ? 'Edit Smart Plan' : 'New Smart Plan'}</h1>
          <p className="text-gray-500 text-sm">Configure your automated workflow</p>
        </div>
        <button
          onClick={save}
          disabled={saving || !form.name.trim()}
          className="ml-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Smart Plan'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Plan details */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Plan Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. New Buyer Welcome"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What does this plan do?"
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Buyer, Seller, Nurture"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <div className="flex gap-2">
                {[true, false].map(active => (
                  <button
                    key={String(active)}
                    onClick={() => setForm(f => ({ ...f, is_active: active }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      form.is_active === active
                        ? active ? 'bg-green-600 text-white border-green-600' : 'bg-gray-600 text-white border-gray-600'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {active ? 'Active' : 'Inactive'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-gray-900 text-sm">Trigger</h2>
            <p className="text-xs text-gray-500">When should this plan start?</p>
            <div className="space-y-2">
              {TRIGGER_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setForm(f => ({ ...f, trigger_type: t.value as typeof form.trigger_type }))}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    form.trigger_type === t.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <p className={`text-sm font-medium ${form.trigger_type === t.value ? 'text-blue-700' : 'text-gray-700'}`}>{t.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Steps builder */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">Workflow Steps</h2>
                <p className="text-xs text-gray-500 mt-0.5">{steps.length} steps · Executed in order</p>
              </div>
              <button
                onClick={() => setShowStepPicker(!showStepPicker)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={15} />
                Add Step
              </button>
            </div>

            {/* Step picker */}
            {showStepPicker && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose step type</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {STEP_TYPES.map(({ type, label, icon: Icon, color, description }) => (
                    <button
                      key={type}
                      onClick={() => addStep(type)}
                      className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left group"
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-700 group-hover:text-blue-700">{label}</p>
                        <p className="text-xs text-gray-400 leading-tight mt-0.5">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Steps list */}
            <div className="space-y-3">
              {steps.map((step, index) => {
                const typeInfo = STEP_TYPES.find(t => t.type === step.step_type)!
                const Icon = typeInfo?.icon ?? Zap

                return (
                  <div key={step.id} className="flex gap-3">
                    {/* Order */}
                    <div className="flex flex-col items-center">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-semibold flex-shrink-0 mt-3">{index + 1}</span>
                      {index < steps.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 mb-1"></div>}
                    </div>

                    {/* Step card */}
                    <div className="flex-1 border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${typeInfo?.color}`}>
                          <Icon size={15} />
                        </div>
                        <input
                          value={step.name}
                          onChange={e => updateStep(step.id, 'name', e.target.value)}
                          className="flex-1 text-sm font-medium text-gray-800 border-0 focus:outline-none bg-transparent"
                        />
                        <button onClick={() => removeStep(step.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Config fields */}
                      <StepConfigEditor
                        step={step}
                        onChange={(key, val) => updateStepConfig(step.id, key, val)}
                      />
                    </div>
                  </div>
                )
              })}

              {steps.length === 0 && (
                <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  <Zap size={24} className="text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No steps yet. Add your first step above.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepConfigEditor({ step, onChange }: {
  step: BuilderStep
  onChange: (key: string, value: unknown) => void
}) {
  const config = step.config

  const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
  const labelClass = "block text-xs font-medium text-gray-600 mb-1"

  switch (step.step_type) {
    case 'send_email':
      return (
        <div className="space-y-2">
          <div>
            <label className={labelClass}>Subject line</label>
            <input value={String(config.subject ?? '')} onChange={e => onChange('subject', e.target.value)} placeholder="Email subject..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Template / Body</label>
            <textarea value={String(config.template ?? '')} onChange={e => onChange('template', e.target.value)} rows={2} placeholder="Email body or template name..." className={`${inputClass} resize-none`} />
          </div>
        </div>
      )
    case 'send_sms':
      return (
        <div>
          <label className={labelClass}>Message <span className="text-gray-400">(SMS placeholder)</span></label>
          <textarea value={String(config.message ?? '')} onChange={e => onChange('message', e.target.value)} rows={2} placeholder="SMS message..." className={`${inputClass} resize-none`} />
        </div>
      )
    case 'create_task':
      return (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Task title</label>
            <input value={String(config.title ?? '')} onChange={e => onChange('title', e.target.value)} placeholder="Task name..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Due in (hours)</label>
            <input type="number" value={String(config.due_offset_hours ?? 24)} onChange={e => onChange('due_offset_hours', parseInt(e.target.value))} className={inputClass} />
          </div>
        </div>
      )
    case 'wait':
      return (
        <div>
          <label className={labelClass}>Wait (days)</label>
          <input type="number" min="1" value={String(config.days ?? 1)} onChange={e => onChange('days', parseInt(e.target.value))} className={`${inputClass} max-w-32`} />
        </div>
      )
    case 'add_tag':
    case 'remove_tag':
      return (
        <div>
          <label className={labelClass}>Tag name</label>
          <input value={String(config.tag ?? '')} onChange={e => onChange('tag', e.target.value)} placeholder="Tag to add/remove..." className={inputClass} />
        </div>
      )
    case 'change_status':
      return (
        <div>
          <label className={labelClass}>New status</label>
          <select value={String(config.new_status ?? 'Active')} onChange={e => onChange('new_status', e.target.value)} className={inputClass}>
            {['New', 'Attempting Contact', 'Active', 'Nurture', 'Appointment Set', 'Client', 'Under Contract', 'Closed', 'Lost'].map(s => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )
    case 'internal_notification':
      return (
        <div>
          <label className={labelClass}>Notification message</label>
          <input value={String(config.message ?? '')} onChange={e => onChange('message', e.target.value)} placeholder="Message to send..." className={inputClass} />
        </div>
      )
    case 'add_note':
      return (
        <div>
          <label className={labelClass}>Note content</label>
          <textarea value={String(config.content ?? '')} onChange={e => onChange('content', e.target.value)} rows={2} placeholder="Note to add to contact..." className={`${inputClass} resize-none`} />
        </div>
      )
    case 'webhook':
      return (
        <div className="space-y-2">
          <div>
            <label className={labelClass}>Webhook URL <span className="text-gray-400">(placeholder)</span></label>
            <input value={String(config.url ?? '')} onChange={e => onChange('url', e.target.value)} placeholder="https://..." className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Method</label>
            <select value={String(config.method ?? 'POST')} onChange={e => onChange('method', e.target.value)} className={`${inputClass} max-w-24`}>
              <option>POST</option>
              <option>GET</option>
              <option>PUT</option>
            </select>
          </div>
        </div>
      )
    case 'assign_user':
      return (
        <div>
          <label className={labelClass}>Note: Will assign to configured agent</label>
          <input value={String(config.user_id ?? '')} onChange={e => onChange('user_id', e.target.value)} placeholder="Agent ID or leave blank for round-robin..." className={inputClass} />
        </div>
      )
    default:
      return null
  }
}
