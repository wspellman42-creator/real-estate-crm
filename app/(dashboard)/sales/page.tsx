import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/sales/KanbanBoard'

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_agent:profiles(id, full_name),
      active_smart_plans:smart_plan_enrollments(id, status, smart_plan:smart_plans(name))
    `)
    .not('pipeline_stage', 'is', null)
    .order('created_at', { ascending: false })

  const processedLeads = leads?.map(lead => ({
    ...lead,
    active_smart_plans: lead.active_smart_plans?.filter((e: { status: string }) => e.status === 'active') ?? [],
  })) ?? []

  return (
    <div className="space-y-5 h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Pipeline</h1>
        <p className="text-gray-500 text-sm mt-0.5">{processedLeads.length} deals in pipeline</p>
      </div>
      <KanbanBoard initialLeads={processedLeads} />
    </div>
  )
}
