'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { GlobalTask } from '@/lib/types'
import { ChevronLeft, ChevronRight, Plus, Check, X, Search } from 'lucide-react'
import { useCompanyId } from '@/hooks/useCompanyId'

interface Props {
  initialTasks: GlobalTask[]
  leads: { id: string; first_name: string; last_name: string }[]
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DOT_COLORS = ['bg-blue-400', 'bg-green-400', 'bg-purple-400', 'bg-orange-400', 'bg-pink-400']

export default function CalendarView({ initialTasks, leads }: Props) {
  const today = new Date()
  const [tasks, setTasks] = useState<GlobalTask[]>(initialTasks)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [showForm, setShowForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTime, setNewTime] = useState('09:00')
  const [newLeadId, setNewLeadId] = useState('')
  const [leadSearch, setLeadSearch] = useState('')
  const [leadDropdownOpen, setLeadDropdownOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const leadSearchRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const companyId = useCompanyId()

  const filteredLeads = leads.filter(l =>
    `${l.first_name} ${l.last_name}`.toLowerCase().includes(leadSearch.toLowerCase())
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (leadSearchRef.current && !leadSearchRef.current.contains(e.target as Node)) {
        setLeadDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTasks = useCallback(async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .order('due_date', { ascending: true })
    if (data) setTasks(data as GlobalTask[])
  }, [supabase])

  useEffect(() => {
    const channel = supabase
      .channel('calendar-tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchTasks()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [supabase, fetchTasks])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }

  // Build calendar grid
  const { days, firstDow } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const firstDow = new Date(year, month, 1).getDay()
    return { days: daysInMonth, firstDow }
  }, [year, month])

  // Group tasks by date string "YYYY-MM-DD"
  const tasksByDay = useMemo(() => {
    const map: Record<string, GlobalTask[]> = {}
    for (const t of tasks) {
      if (!t.due_date) continue
      const d = new Date(t.due_date)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(t)
    }
    return map
  }, [tasks])

  function dayKey(d: number) { return `${year}-${month}-${d}` }

  function selectedDayTasks(): GlobalTask[] {
    if (!selectedDay) return []
    return tasksByDay[dayKey(selectedDay)] ?? []
  }

  async function toggleTask(id: string, completed: boolean) {
    const now = new Date().toISOString()
    await supabase.from('tasks').update({
      completed: !completed,
      completed_at: !completed ? now : null,
    }).eq('id', id)
  }

  async function addTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !selectedDay) return
    setAdding(true)
    const { data: { user } } = await supabase.auth.getUser()
    const dueDate = new Date(year, month, selectedDay)
    const [h, m] = newTime.split(':').map(Number)
    dueDate.setHours(h, m, 0, 0)
    await supabase.from('tasks').insert({
      title: newTitle,
      due_date: dueDate.toISOString(),
      lead_id: newLeadId || null,
      assigned_to_id: user?.id,
      company_id: companyId,
    })
    setNewTitle('')
    setNewTime('09:00')
    setNewLeadId('')
    setLeadSearch('')
    setShowForm(false)
    setAdding(false)
  }

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Calendar grid */}
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="font-semibold text-gray-900">{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wide">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDow }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/30" />
          ))}

          {Array.from({ length: days }).map((_, i) => {
            const d = i + 1
            const key = dayKey(d)
            const dayTasks = tasksByDay[key] ?? []
            const selected = selectedDay === d
            const today_ = isToday(d)

            return (
              <div
                key={d}
                onClick={() => setSelectedDay(d)}
                className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors ${
                  selected ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`w-6 h-6 flex items-center justify-center text-xs font-semibold mb-1 rounded-full ${
                  today_ ? 'bg-blue-600 text-white' : selected ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                }`}>
                  {d}
                </div>
                <div className="space-y-0.5">
                  {dayTasks.slice(0, 3).map((t, idx) => (
                    <div
                      key={t.id}
                      className={`text-xs px-1 py-0.5 rounded truncate text-white ${DOT_COLORS[idx % DOT_COLORS.length]} ${t.completed ? 'opacity-50' : ''}`}
                    >
                      {t.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div className="text-xs text-gray-400 px-1">+{dayTasks.length - 3} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Day detail panel */}
      <div className="bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">
            {selectedDay
              ? `${MONTHS[month]} ${selectedDay}`
              : 'Select a day'}
          </h2>
          {selectedDay && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus size={14} />
              Add
            </button>
          )}
        </div>

        <div className="flex-1 p-4 overflow-y-auto">
          {/* Add task mini form */}
          {showForm && selectedDay && (
            <form onSubmit={addTask} className="mb-4 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Task title…"
                required
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={e => setNewTime(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                />
              </div>
              <div ref={leadSearchRef} className="relative">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={leadSearch}
                    onChange={e => { setLeadSearch(e.target.value); setLeadDropdownOpen(true); if (!e.target.value) setNewLeadId('') }}
                    placeholder="Search leads…"
                    className="w-full border border-gray-300 rounded-lg pl-7 pr-7 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                  />
                  {newLeadId && (
                    <button type="button" onClick={() => { setNewLeadId(''); setLeadSearch('') }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  )}
                </div>
                {leadDropdownOpen && leadSearch.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-36 overflow-y-auto">
                    {filteredLeads.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-gray-400">No leads found</p>
                    ) : (
                      filteredLeads.map(l => (
                        <button key={l.id} type="button"
                          onMouseDown={() => { setNewLeadId(l.id); setLeadSearch(`${l.first_name} ${l.last_name}`); setLeadDropdownOpen(false) }}
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${newLeadId === l.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}>
                          {l.first_name} {l.last_name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 text-xs py-1.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={adding || !newTitle.trim()}
                  className="flex-1 text-xs py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {adding ? 'Adding…' : 'Add'}
                </button>
              </div>
            </form>
          )}

          {selectedDay ? (
            selectedDayTasks().length > 0 ? (
              <div className="space-y-2">
                {selectedDayTasks().map(t => {
                  const isOverdue = !t.completed && t.due_date && new Date(t.due_date) < new Date()
                  return (
                    <div
                      key={t.id}
                      className={`flex items-start gap-2.5 p-3 rounded-lg border ${
                        isOverdue ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(t.id, t.completed)}
                        className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          t.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'
                        }`}
                      >
                        {t.completed && <Check size={9} className="text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {t.title}
                        </p>
                        {t.due_date && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {new Date(t.due_date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        )}
                        {t.lead && (
                          <Link href={`/crm/${t.lead.id}`} className="text-xs text-blue-500 hover:underline">
                            {t.lead.first_name} {t.lead.last_name}
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">No tasks on this day</p>
                <button onClick={() => setShowForm(true)} className="text-xs text-blue-500 hover:underline mt-1">Add a task</button>
              </div>
            )
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-400 text-sm">Click a day to see its tasks</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
