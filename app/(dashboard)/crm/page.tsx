import { createClient } from '@/lib/supabase/server'
import LeadsTable from '@/components/crm/LeadsTable'
import AddLeadButton from '@/components/crm/AddLeadButton'
import ImportLeadsButton from '@/components/crm/ImportLeadsButton'
import type { Lead } from '@/lib/types'

const PAGE_SIZE = 50

const SORT_COLUMN: Record<string, string> = {
  name: 'first_name',
  status: 'status',
  pipeline_type: 'pipeline_type',
  lead_source: 'lead_source',
  created_at: 'created_at',
  last_contacted_at: 'last_contacted_at',
}

export default async function CRMPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params = await searchParams
  const page    = Math.max(1, parseInt(params.page ?? '1'))
  const search  = params.search ?? ''
  const status  = params.status ?? ''
  const type    = params.type ?? ''
  const source  = params.source ?? ''
  const pipeline = params.pipeline ?? ''
  const agent   = params.agent ?? ''
  const sort    = params.sort ?? 'created_at'
  const dir     = params.dir ?? 'desc'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  const isAgent = currentUser?.role !== 'admin'

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1

  let query = supabase
    .from('leads')
    .select(`
      id, first_name, last_name, email, phone,
      lead_type, lead_source, status, pipeline_type,
      assigned_agent_id, deal_value, last_contacted_at, created_at, updated_at,
      assigned_agent:users(id, full_name),
      tags:lead_tags(tag:tags(*)),
      active_smart_plans:smart_plan_enrollments(id, status, smart_plan:smart_plans(id, name))
    `, { count: 'exact' })

  if (isAgent) query = query.eq('assigned_agent_id', user?.id ?? '')
  if (search) query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  if (status) query = query.eq('status', status)
  if (type) query = query.eq('lead_type', type)
  if (source) query = query.eq('lead_source', source)
  if (pipeline) query = query.eq('pipeline_type', pipeline)
  if (agent) query = query.eq('assigned_agent_id', agent)

  const col = SORT_COLUMN[sort] ?? 'created_at'
  query = query.order(col, { ascending: dir === 'asc' }).range(from, to)

  const { data: leads, count, error } = await query

  const processedLeads = (leads ?? []).map(lead => ({
    ...lead,
    tags: (lead.tags as { tag: unknown }[] | null)?.map(lt => lt.tag) ?? [],
    active_smart_plans: (lead.active_smart_plans as { status: string }[] | null)?.filter(e => e.status === 'active') ?? [],
  })) as unknown as Lead[]

  const { data: agents } = await supabase.from('users').select('id, full_name')

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM</h1>
          <p className="text-gray-500 text-sm mt-0.5">{count ?? 0} leads total</p>
        </div>
        <div className="flex items-center gap-2">
          <ImportLeadsButton agents={agents ?? []} />
          <AddLeadButton agents={agents ?? []} />
        </div>
      </div>

      <LeadsTable
        leads={processedLeads}
        agents={agents ?? []}
        totalCount={count ?? 0}
        page={page}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        currentFilters={{ search, status, type, source, pipeline, agent, sort, dir }}
      />
    </div>
  )
}
