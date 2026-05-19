import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import LeadProfile from '@/components/crm/LeadProfile'

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      assigned_agent:users(id, full_name, email, role),
      tags:lead_tags(tag:tags(*)),
      notes:lead_notes(*, author:users(full_name)),
      tasks(*, assigned_to:users(full_name)),
      active_smart_plans:smart_plan_enrollments(*, smart_plan:smart_plans(*))
    `)
    .eq('id', id)
    .single()

  if (!lead) notFound()

  const processedLead = {
    ...lead,
    tags: lead.tags?.map((lt: { tag: unknown }) => lt.tag) ?? [],
  }

  const { data: agents } = await supabase.from('users').select('id, full_name')
  const { data: smartPlans } = await supabase.from('smart_plans').select('id, name, category').eq('is_active', true)
  const { data: allTags } = await supabase.from('tags').select('*')
  const { data: activity } = await supabase
    .from('lead_activity')
    .select('*, user:users(full_name)')
    .eq('lead_id', id)
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <LeadProfile
      lead={processedLead}
      agents={agents ?? []}
      smartPlans={smartPlans ?? []}
      allTags={allTags ?? []}
      activity={activity ?? []}
    />
  )
}
