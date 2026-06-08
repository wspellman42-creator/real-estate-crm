import { createClient } from '@/lib/supabase/server'
import { GlobalTask } from '@/lib/types'
import TasksView from '@/components/tasks/TasksView'

export default async function TasksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: tasks },
    { data: leads },
  ] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .eq('assigned_to_id', user?.id ?? '')
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('leads')
      .select('id, first_name, last_name')
      .order('last_name', { ascending: true }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <p className="text-gray-500 text-sm mt-0.5">Today&apos;s tasks and what&apos;s coming up</p>
      </div>
      <TasksView
        initialTasks={(tasks ?? []) as GlobalTask[]}
        leads={leads ?? []}
      />
    </div>
  )
}
