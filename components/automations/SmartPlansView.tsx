'use client'

import { useState } from 'react'
import { SmartPlan } from '@/lib/types'
import { Zap, Plus, Play, Pause, Trash2, ChevronDown, ChevronRight, Mail, MessageSquare, CheckSquare, Clock, Tag, AlertCircle, User, FileText, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import SmartPlanBuilder from './SmartPlanBuilder'

interface SmartPlansViewProps {
  smartPlans: (SmartPlan & { enrollment_count: number })[]
}

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manual Assignment',
  new_lead: 'New Lead Created',
  status_changed: 'Status Changed',
  tag_added: 'Tag Added',
  no_contact: 'No Contact After X Days',
}

const STEP_ICONS: Record<string, React.ElementType> = {
  send_email: Mail,
  send_sms: MessageSquare,
  create_task: CheckSquare,
  wait: Clock,
  add_tag: Tag,
  remove_tag: Tag,
  change_status: AlertCircle,
  internal_notification: AlertCircle,
  assign_user: User,
  add_note: FileText,
  webhook: Globe,
}

const STEP_COLORS: Record<string, string> = {
  send_email: 'bg-blue-100 text-blue-700',
  send_sms: 'bg-green-100 text-green-700',
  create_task: 'bg-orange-100 text-orange-700',
  wait: 'bg-gray-100 text-gray-600',
  add_tag: 'bg-purple-100 text-purple-700',
  remove_tag: 'bg-red-100 text-red-700',
  change_status: 'bg-yellow-100 text-yellow-700',
  internal_notification: 'bg-pink-100 text-pink-700',
  assign_user: 'bg-indigo-100 text-indigo-700',
  add_note: 'bg-teal-100 text-teal-700',
  webhook: 'bg-gray-100 text-gray-600',
}

export default function SmartPlansView({ smartPlans }: SmartPlansViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showBuilder, setShowBuilder] = useState(false)
  const [editPlan, setEditPlan] = useState<SmartPlan | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function toggleActive(plan: SmartPlan) {
    await supabase.from('smart_plans').update({ is_active: !plan.is_active }).eq('id', plan.id)
    router.refresh()
  }

  async function deletePlan(id: string) {
    if (!confirm('Delete this Smart Plan? All enrollments will be removed.')) return
    await supabase.from('smart_plans').delete().eq('id', id)
    router.refresh()
  }

  function handleEdit(plan: SmartPlan) {
    setEditPlan(plan)
    setShowBuilder(true)
  }

  if (showBuilder) {
    return (
      <SmartPlanBuilder
        plan={editPlan}
        onClose={() => { setShowBuilder(false); setEditPlan(null); router.refresh() }}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-lg font-bold text-gray-900">{smartPlans.length}</p>
            <p className="text-xs text-gray-500">Total Plans</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-lg font-bold text-green-600">{smartPlans.filter(p => p.is_active).length}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-2 text-center">
            <p className="text-lg font-bold text-purple-600">{smartPlans.reduce((s, p) => s + p.enrollment_count, 0)}</p>
            <p className="text-xs text-gray-500">Enrollments</p>
          </div>
        </div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          New Smart Plan
        </button>
      </div>

      {/* Plans list */}
      <div className="space-y-3">
        {smartPlans.map(plan => {
          const isExpanded = expandedId === plan.id
          const steps = (plan.steps ?? []) as Array<{ id: string; step_type: string; name: string; step_order: number }>

          return (
            <div key={plan.id} className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center gap-4 p-4">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${plan.is_active ? 'bg-purple-100' : 'bg-gray-100'}`}>
                  <Zap size={18} className={plan.is_active ? 'text-purple-600' : 'text-gray-400'} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                    {plan.category && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{plan.category}</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${plan.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {plan.description && <p className="text-sm text-gray-500 mt-0.5 truncate">{plan.description}</p>}
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                    <span>Trigger: {TRIGGER_LABELS[plan.trigger_type]}</span>
                    <span>{steps.length} steps</span>
                    <span className="text-purple-600 font-medium">{plan.enrollment_count} enrolled</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(plan)}
                    className={`p-2 rounded-lg transition-colors ${plan.is_active ? 'text-orange-500 hover:bg-orange-50' : 'text-green-500 hover:bg-green-50'}`}
                    title={plan.is_active ? 'Pause' : 'Activate'}
                  >
                    {plan.is_active ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    onClick={() => handleEdit(plan)}
                    className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deletePlan(plan.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded steps */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Workflow Steps</h4>
                  {steps.length === 0 ? (
                    <p className="text-sm text-gray-400">No steps defined yet. Click Edit to add steps.</p>
                  ) : (
                    <div className="space-y-2">
                      {steps.map((step, index) => {
                        const Icon = STEP_ICONS[step.step_type] ?? Zap
                        const colorClass = STEP_COLORS[step.step_type] ?? 'bg-gray-100 text-gray-600'
                        return (
                          <div key={step.id} className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center font-medium flex-shrink-0">{index + 1}</span>
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${colorClass}`}>
                              <Icon size={13} />
                              {step.name}
                            </div>
                            {index < steps.length - 1 && (
                              <div className="h-px flex-1 bg-gray-100 hidden"></div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {smartPlans.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <Zap size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No Smart Plans yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first automation workflow</p>
            <button
              onClick={() => setShowBuilder(true)}
              className="mt-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mx-auto"
            >
              <Plus size={15} />
              Create Smart Plan
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
