import { createClient } from '@/lib/supabase/server'
import LeadsTable from '@/components/crm/LeadsTable'
import AddLeadButton from '@/components/crm/AddLeadButton'
import { Search } from 'lucide-react'

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; search?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('leads')
    .select(`
      *,
      assigned_agent:users(id, full_name, email),
      tags:lead_tags(tag:tags(*)),
      active_smart_plans:smart_plan_enrollments(
        id, status, smart_plan:smart_plans(id, name)
      )
    `)
    .order('created_at', { ascending: false })

  if (params.status) {
    query = query.eq('status', params.status)
  }
  if (params.type) {
    query = query.eq('lead_type', params.type)
  }

  const { data: leads, error } = await query

  const processedLeads = leads?.map(lead => ({
    ...lead,
    tags: lead.tags?.map((lt: { tag: unknown }) => lt.tag) ?? [],
    active_smart_plans: lead.active_smart_plans?.filter((e: { status: string }) => e.status === 'active') ?? [],
  })) ?? []

  const { data: agents } = await supabase.from('users').select('id, full_name')

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-500 text-sm mt-0.5">{processedLeads.length} leads total</p>
        </div>
        <AddLeadButton agents={agents ?? []} />
      </div>

      <LeadsTable leads={processedLeads} agents={agents ?? []} />
    </div>
  )
}
