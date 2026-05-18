import { createClient } from '@/lib/supabase/server'
import SmartPlansView from '@/components/automations/SmartPlansView'

export default async function AutomationsPage() {
  const supabase = await createClient()

  const { data: smartPlans } = await supabase
    .from('smart_plans')
    .select(`
      *,
      steps:smart_plan_steps(*),
      enrollments:smart_plan_enrollments(id, status)
    `)
    .order('created_at', { ascending: false })

  const processedPlans = smartPlans?.map(plan => ({
    ...plan,
    enrollment_count: plan.enrollments?.filter((e: { status: string }) => e.status === 'active').length ?? 0,
    steps: plan.steps?.sort((a: { step_order: number }, b: { step_order: number }) => a.step_order - b.step_order) ?? [],
  })) ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automations</h1>
        <p className="text-gray-500 text-sm mt-0.5">Smart Plans &amp; automated workflows</p>
      </div>
      <SmartPlansView smartPlans={processedPlans} />
    </div>
  )
}
