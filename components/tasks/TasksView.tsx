'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlobalTask } from '@/lib/types'
import { Plus, Check, AlertCircle, Clock, CheckCircle2, CalendarDays, X } from 'lucide-react'
import { useCompanyId } from '@/hooks/useCompanyId'

interface Props {
  initialTasks: GlobalTask[]
  leads: { id: string; first_name: string; last_name: string }[]
}

function todayStart() {
  const d = new Date(); d.setHours(0, 0, 0, 0); return d
}
function todayEnd() {
  const d = new Date(); d.setHours(23, 59, 59, 999); return d
}
function sevenDaysOut() {
  const d = new Date(); d.setDate(d.getDate() + 7); d.setHours(23, 59, 59, 999); return d
}

function categorizeTasks(tasks: GlobalTask[]) {
  const start = todayStart()
  const end = todayEnd()
  const seven = sevenDaysOut()
  const overdue: GlobalTask[] = []
  const today: GlobalTask[] = []
  const upcoming: GlobalTask[] = []
  const completedToday: GlobalTask[] = []

  for (const t of tasks) {
    if (t.completed) {
      if (t.completed_at && new Date(t.completed_at) >= start) completedToday.push(t)
      continue
    }
    if (!t.due_date) { today.push(t); continue }
    const due = new Date(t.due_date)
    if (due < start) overdue.push(t)
    else if (due <= end) today.push(t)
    else if (due <= seven) upcoming.push(t)
  }
  return { overdue, today, upcoming, completedToday }
}

function TaskRow({ task, onToggle, onDelete, overdue = false }: {
  task: GlobalTask
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
  overdue?: boolean
}) {
  const leadName = task.lead ? `${task.lead.first_name} ${task.lead.last_name}` : null
  return (
    <div className={`flex items-center gap-3 p-3.5 rounded-lg border transition-colors group ${
      overdue ? 'border-red-200 bg-red-50/50' : task.completed ? 'border-gray-100 bg-gray-50/50 opacity-70' : 'border-gray-100 hover:bg-gray-50'
    }`}>
      <button
        onClick={() => onToggle(task.id, task.completed)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          task.completed ? 'bg-green-500 border-green-500' : overdue ? 'border-red-300 hover:border-red-500' : 'border-gray-300 hover:border-blue-500'
        }`}
      >
        {task.completed && <Check size={11} className="text-white" />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
        {leadName && (
          <Link href={`/crm/${task.lead?.id}`} className="text-xs text-blue-500 hover:underline">{leadName}</Link>
        )}
      </div>
      {task.due_date && (
        <span className={`text-xs font-medium flex-shrink-0 ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
          {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 transition-all flex-shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}

function Section({ title, icon: Icon, iconColor, count, countColor, children }: {
  title: string; icon: React.ElementType; iconColor: string; count: number; countColor: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <Icon size={16} className={iconColor} />
        <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
        {count > 0 && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${countColor}`}>{count}</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        {children}
      </div>
    </div>
  )
}

export default function TasksView({ initialTasks, leads }: Props) {
  const [tasks, setTasks] = useState<GlobalTask[]>(initialTasks)
  const [newTitle, setNewTitle] = useState('')
  const [newDue, setNewDue] = useState('')
  const [newLeadId, setNewLeadId] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()
  const companyId = useCompanyId()

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .order('due_date', { ascending: true, nullsFirst: false })
    if (data) setTasks(data as GlobalTask[])
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('tasks-view-realtime')
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

  async function deleteTask(id: string) {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').insert({
      title: newTitle,
      due_date: newDue || null,
      lead_id: newLeadId || null,
      assigned_to_id: user?.id,
      company_id: companyId,
    })
    setNewTitle('')
    setNewDue('')
    setNewLeadId('')
    setShowForm(false)
    setAdding(false)
  }

  const { overdue, today, upcoming, completedToday } = categorizeTasks(tasks)

  return (
    <div className="space-y-5">
      {/* Add task form */}
      {showForm ? (
        <form onSubmit={addTask} className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
          <div className="flex gap-3">
            <input
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Task title…"
              autoFocus
              required
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="datetime-local"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={newLeadId}
              onChange={e => setNewLeadId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
            >
              <option value="">No lead (standalone task)</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={adding || !newTitle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {adding ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue */}
        <Section title="Overdue" icon={AlertCircle} iconColor="text-red-500" count={overdue.length} countColor="bg-red-100 text-red-700">
          {overdue.length > 0
            ? overdue.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} overdue />)
            : <p className="text-sm text-gray-400 text-center py-4">No overdue tasks ✓</p>
          }
        </Section>

        {/* Today */}
        <Section title="Today" icon={CalendarDays} iconColor="text-blue-500" count={today.length} countColor="bg-blue-100 text-blue-700">
          {today.length > 0
            ? today.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)
            : <p className="text-sm text-gray-400 text-center py-4">No tasks for today 🎉</p>
          }
        </Section>

        {/* Upcoming */}
        <Section title="Upcoming (Next 7 Days)" icon={Clock} iconColor="text-yellow-500" count={upcoming.length} countColor="bg-yellow-100 text-yellow-700">
          {upcoming.length > 0
            ? upcoming.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)
            : <p className="text-sm text-gray-400 text-center py-4">No upcoming tasks</p>
          }
        </Section>

        {/* Completed Today */}
        <Section title="Completed Today" icon={CheckCircle2} iconColor="text-green-500" count={completedToday.length} countColor="bg-green-100 text-green-700">
          {completedToday.length > 0
            ? completedToday.map(t => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={deleteTask} />)
            : <p className="text-sm text-gray-400 text-center py-4">Nothing completed yet today</p>
          }
        </Section>
      </div>
    </div>
  )
}
