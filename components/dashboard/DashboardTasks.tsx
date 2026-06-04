'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlobalTask } from '@/lib/types'
import { Check, AlertCircle, Clock, CheckCircle2, CalendarDays } from 'lucide-react'

interface Props {
  initialTasks: GlobalTask[]
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function sevenDaysOut() {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  d.setHours(23, 59, 59, 999)
  return d
}

function categorizeTasks(tasks: GlobalTask[]) {
  const now = new Date()
  const start = todayStart()
  const end = todayEnd()
  const seven = sevenDaysOut()

  const overdue: GlobalTask[] = []
  const today: GlobalTask[] = []
  const upcoming: GlobalTask[] = []
  const completedToday: GlobalTask[] = []

  for (const t of tasks) {
    if (t.completed) {
      if (t.completed_at && new Date(t.completed_at) >= start) {
        completedToday.push(t)
      }
      continue
    }
    if (!t.due_date) {
      today.push(t)
      continue
    }
    const due = new Date(t.due_date)
    if (due < start) {
      overdue.push(t)
    } else if (due <= end) {
      today.push(t)
    } else if (due <= seven) {
      upcoming.push(t)
    }
  }

  return { overdue, today, upcoming, completedToday }
}

function TaskRow({
  task,
  onToggle,
  showDate = false,
  overdue = false,
}: {
  task: GlobalTask
  onToggle: (id: string, completed: boolean) => void
  showDate?: boolean
  overdue?: boolean
}) {
  const leadName = task.lead
    ? `${task.lead.first_name} ${task.lead.last_name}`
    : null

  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50/50' : ''}`}>
      <button
        onClick={() => onToggle(task.id, task.completed)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.completed
            ? 'bg-green-500 border-green-500'
            : overdue
            ? 'border-red-300 hover:border-red-500'
            : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {task.completed && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        {leadName && (
          <p className="text-xs text-gray-400 truncate">{leadName}</p>
        )}
      </div>
      {showDate && task.due_date && (
        <span className={`text-xs flex-shrink-0 font-medium ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  )
}

export default function DashboardTasks({ initialTasks }: Props) {
  const [tasks, setTasks] = useState<GlobalTask[]>(initialTasks)
  const supabase = createClient()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .order('due_date', { ascending: true, nullsFirst: false })
    if (data) setTasks(data as GlobalTask[])
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchTasks])

  async function toggleTask(id: string, completed: boolean) {
    const now = new Date().toISOString()
    await supabase.from('tasks').update({
      completed: !completed,
      completed_at: !completed ? now : null,
    }).eq('id', id)
  }

  const { overdue, today, upcoming, completedToday } = categorizeTasks(tasks)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Today's Tasks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-blue-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Today&apos;s Tasks</h2>
            {today.length > 0 && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{today.length}</span>
            )}
          </div>
          <Link href="/tasks" className="text-xs text-blue-600 hover:text-blue-700 font-medium">View all</Link>
        </div>
        <div>
          {today.length > 0 ? (
            today.slice(0, 5).map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} showDate />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">No tasks for today 🎉</div>
          )}
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-yellow-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Upcoming</h2>
            {upcoming.length > 0 && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-semibold">{upcoming.length}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Next 7 days</span>
        </div>
        <div>
          {upcoming.length > 0 ? (
            upcoming.slice(0, 5).map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} showDate />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">No upcoming tasks</div>
          )}
        </div>
      </div>

      {/* Overdue Tasks */}
      <div className="bg-white rounded-xl border border-red-200">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-red-100">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-red-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Overdue Tasks</h2>
            {overdue.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">{overdue.length}</span>
            )}
          </div>
        </div>
        <div>
          {overdue.length > 0 ? (
            overdue.map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} showDate overdue />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">No overdue tasks ✓</div>
          )}
        </div>
      </div>

      {/* Completed Today */}
      <div className="bg-white rounded-xl border border-green-200">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-green-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-green-500" />
            <h2 className="font-semibold text-gray-900 text-sm">Completed Today</h2>
            {completedToday.length > 0 && (
              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{completedToday.length}</span>
            )}
          </div>
          <span className="text-xs text-gray-400">Resets at midnight</span>
        </div>
        <div>
          {completedToday.length > 0 ? (
            completedToday.map(t => (
              <TaskRow key={t.id} task={t} onToggle={toggleTask} />
            ))
          ) : (
            <div className="py-8 text-center text-gray-400 text-sm">Nothing completed yet today</div>
          )}
        </div>
      </div>
    </div>
  )
}
