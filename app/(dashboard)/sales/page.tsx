import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/sales/KanbanBoard'

export default async function SalesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const isAgent = currentUser?.role !== 'admin'

  let query = supabase
    .from('leads')
    .select(`
      *,
      assigned_agent:users(id, full_name),
      active_smart_plans:smart_plan_enrollments(id, status, smart_plan:smart_plans(name))
    `)
    .not('pipeline_stage', 'is', null)
    .order('created_at', { ascending: false })

  if (isAgent) {
    query = query.eq('assigned_agent_id', user?.id ?? '')
  }

  const { data: leads } = await query

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
