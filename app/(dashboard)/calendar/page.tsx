import { createClient } from '@/lib/supabase/server'
import { GlobalTask } from '@/lib/types'
import CalendarView from '@/components/calendar/CalendarView'

export default async function CalendarPage() {
  const supabase = await createClient()

  const [{ data: tasks }, { data: leads }] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .order('due_date', { ascending: true }),
    supabase.from('leads').select('id, first_name, last_name').order('last_name', { ascending: true }),
  ])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-500 text-sm mt-0.5">All your tasks in a calendar layout</p>
      </div>
      <CalendarView
        initialTasks={(tasks ?? []) as GlobalTask[]}
        leads={leads ?? []}
      />
    </div>
  )
}
