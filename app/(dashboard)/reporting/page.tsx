import { createClient } from '@/lib/supabase/server'
import ReportingView from '@/components/reporting/ReportingView'

export default async function ReportingPage() {
  const supabase = await createClient()

  const [
    { count: totalLeads },
    { count: activeLeads },
    { count: closedLeads },
    { count: totalTasks },
    { count: completedTasks },
    { data: leadsBySource },
    { data: leadsByStatus },
    { data: recentLeads },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Closed'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', true),
    supabase.from('leads').select('lead_source').not('lead_source', 'is', null),
    supabase.from('leads').select('status'),
    supabase.from('leads').select('created_at').order('created_at', { ascending: false }).limit(90),
  ])

  // Count by source
  const sourceMap: Record<string, number> = {}
  for (const l of leadsBySource ?? []) {
    const s = l.lead_source ?? 'Unknown'
    sourceMap[s] = (sourceMap[s] ?? 0) + 1
  }

  // Count by status
  const statusMap: Record<string, number> = {}
  for (const l of leadsByStatus ?? []) {
    statusMap[l.status] = (statusMap[l.status] ?? 0) + 1
  }

  // Monthly lead counts (last 6 months)
  const now = new Date()
  const monthlyLeads: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const label = d.toLocaleDateString('en-US', { month: 'short' })
    const start = d.toISOString()
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
    const count = (recentLeads ?? []).filter(l => l.created_at >= start && l.created_at <= end).length
    monthlyLeads.push({ month: label, count })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
        <p className="text-gray-500 text-sm mt-0.5">Team performance trends</p>
      </div>
      <ReportingView
        stats={{
          totalLeads: totalLeads ?? 0,
          activeLeads: activeLeads ?? 0,
          closedLeads: closedLeads ?? 0,
          totalTasks: totalTasks ?? 0,
          completedTasks: completedTasks ?? 0,
        }}
        sourceMap={sourceMap}
        statusMap={statusMap}
        monthlyLeads={monthlyLeads}
      />
    </div>
  )
}
