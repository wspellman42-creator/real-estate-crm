'use client'

import { useState, useCallback } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { Lead, PipelineStage } from '@/lib/types'
import { PIPELINE_STAGES, getStageColor, formatCurrency, getStatusColor } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Zap, User, DollarSign } from 'lucide-react'

interface KanbanBoardProps {
  initialLeads: Lead[]
}

function PipelineCard({ lead, isDragging }: { lead: Lead; isDragging?: boolean }) {
  const smartPlans = (lead.active_smart_plans ?? []) as Array<{ id: string; smart_plan: { name: string } }>
  
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all ${isDragging ? 'opacity-50 rotate-1' : ''}`}>
      <Link href={`/crm/${lead.id}`} className="block">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
            {lead.first_name[0]}{lead.last_name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
          </div>
        </div>
      </Link>

      {lead.deal_value && (
        <div className="flex items-center gap-1 mb-2">
          <DollarSign size={12} className="text-green-500" />
          <span className="text-xs font-semibold text-green-600">{formatCurrency(lead.deal_value)}</span>
        </div>
      )}

      {lead.assigned_agent_id && lead.assigned_agent && (
        <div className="flex items-center gap-1 mb-2">
          <User size={11} className="text-gray-400" />
          <span className="text-xs text-gray-500">{(lead.assigned_agent as { full_name: string }).full_name}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-1">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getStatusColor(lead.status)}`}>
          {lead.status}
        </span>
        {smartPlans.length > 0 && (
          <div className="flex items-center gap-1 text-purple-600">
            <Zap size={11} />
            <span className="text-xs">{smartPlans.length}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function SortableCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
      <PipelineCard lead={lead} isDragging={isDragging} />
    </div>
  )
}

function StageColumn({ stage, leads }: { stage: PipelineStage; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const color = getStageColor(stage)
  const totalValue = leads.reduce((sum, l) => sum + (l.deal_value ?? 0), 0)

  return (
    <div className="flex-shrink-0 w-64">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></div>
          <span className="text-xs font-semibold text-gray-700">{stage}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {totalValue > 0 && <span className="text-xs text-green-600 font-medium">{formatCurrency(totalValue)}</span>}
          <span className="w-5 h-5 bg-gray-200 text-gray-600 text-xs rounded-full flex items-center justify-center font-medium">{leads.length}</span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`min-h-24 rounded-xl p-2 space-y-2 transition-colors ${isOver ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-100'}`}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => <SortableCard key={lead.id} lead={lead} />)}
        </SortableContext>
      </div>
    </div>
  )
}

export default function KanbanBoard({ initialLeads }: KanbanBoardProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [activeId, setActiveId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const getLeadsForStage = useCallback((stage: PipelineStage) => {
    return leads.filter(l => l.pipeline_stage === stage)
  }, [leads])

  const activeLead = activeId ? leads.find(l => l.id === activeId) : null

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const leadId = active.id as string
    const newStage = over.id as PipelineStage

    if (!PIPELINE_STAGES.includes(newStage)) return
    
    const lead = leads.find(l => l.id === leadId)
    if (!lead || lead.pipeline_stage === newStage) return

    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, pipeline_stage: newStage } : l))
    await supabase.from('leads').update({ pipeline_stage: newStage }).eq('id', leadId)
    router.refresh()
  }

  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActiveId(e.active.id as string)} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
        {PIPELINE_STAGES.map(stage => (
          <StageColumn key={stage} stage={stage} leads={getLeadsForStage(stage)} />
        ))}
      </div>
      <DragOverlay>
        {activeLead && <PipelineCard lead={activeLead} />}
      </DragOverlay>
    </DndContext>
  )
}
