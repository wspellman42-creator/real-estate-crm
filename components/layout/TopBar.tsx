'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Bell, LogOut, ChevronDown, X, CheckSquare, FileText, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Profile } from '@/lib/types'
import { getInitials, timeAgo } from '@/lib/utils'

interface TopBarProps {
  profile: Profile | null
}

interface LeadResult {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  status: string
}

interface NotifTask {
  id: string
  title: string
  due_date: string | null
  lead?: { id: string; first_name: string; last_name: string } | null
}

interface NotifNote {
  id: string
  content: string
  note_type: string
  created_at: string
  lead: { id: string; first_name: string; last_name: string }
}

export default function TopBar({ profile }: TopBarProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [showNotifs, setShowNotifs] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LeadResult[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifTasks, setNotifTasks] = useState<NotifTask[]>([])
  const [notifNotes, setNotifNotes] = useState<NotifNote[]>([])
  const [notifLoaded, setNotifLoaded] = useState(false)

  const router = useRouter()
  // Stable Supabase client — created once on mount, never re-created on re-render
  const supabase = useRef(createClient()).current
  const searchRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false)
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Debounced lead search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }
    searchTimer.current = setTimeout(async () => {
      const q = searchQuery.trim()
      const { data } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, status')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(6)
      setSearchResults((data as LeadResult[]) ?? [])
      setSearchOpen(true)
    }, 300)
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current)
    }
  }, [searchQuery, supabase])

  // Load notifications: all my open tasks + recent notes (48h)
  const loadNotifications = useCallback(async () => {
    if (!profile?.id) return
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

    const [{ data: tasks }, { data: notes }] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, due_date, lead:leads(id, first_name, last_name)')
        .eq('assigned_to_id', profile.id)
        .eq('completed', false)
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(10),
      supabase
        .from('lead_notes')
        .select('id, content, note_type, created_at, lead:leads(id, first_name, last_name)')
        .eq('author_id', profile.id)
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    if (tasks) setNotifTasks(tasks as NotifTask[])
    if (notes) setNotifNotes(notes as NotifNote[])
    setNotifLoaded(true)
  }, [profile?.id, supabase])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleSearchSelect(leadId: string) {
    setSearchQuery('')
    setSearchResults([])
    setSearchOpen(false)
    router.push(`/crm/${leadId}`)
  }

  function taskDueLabel(dueDate: string | null): { text: string; urgent: boolean } {
    if (!dueDate) return { text: 'No due date', urgent: false }
    const due = new Date(dueDate)
    const now = new Date()
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    if (due < now) return { text: 'Overdue', urgent: true }
    if (due <= todayEnd) return { text: 'Due today', urgent: true }
    return { text: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), urgent: false }
  }

  const totalNotifs = notifTasks.length + notifNotes.length

  return (
    <div className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      {/* Search */}
      <div ref={searchRef} className="flex-1 max-w-md relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => { if (searchResults.length > 0) setSearchOpen(true) }}
          placeholder="Search leads, contacts..."
          className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); setSearchOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}

        {/* Search results dropdown */}
        {searchOpen && (
          <div className="absolute top-full mt-1.5 w-full bg-white rounded-xl border border-gray-200 shadow-lg z-50 overflow-hidden">
            {searchResults.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-400">No leads found</p>
            ) : (
              <>
                <div className="px-4 py-1.5 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Leads</p>
                </div>
                {searchResults.map(lead => (
                  <button
                    key={lead.id}
                    onMouseDown={() => handleSearchSelect(lead.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{lead.first_name} {lead.last_name}</p>
                      <p className="text-xs text-gray-400 truncate">{lead.email || lead.phone || '—'}</p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">{lead.status}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => { setShowNotifs(v => !v); if (!notifLoaded) loadNotifications() }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors relative"
          >
            <Bell size={18} />
            {totalNotifs > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-[9px] font-bold leading-none">{totalNotifs > 9 ? '9+' : totalNotifs}</span>
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-white rounded-xl border border-gray-200 shadow-xl z-50 flex flex-col max-h-[500px] overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {totalNotifs > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">{totalNotifs}</span>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {/* Open tasks */}
                {notifTasks.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                      <CheckSquare size={11} className="text-gray-400" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">My Open Tasks</p>
                    </div>
                    {notifTasks.map(task => {
                      const { text: dueText, urgent } = taskDueLabel(task.due_date)
                      return (
                        <div key={task.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50">
                          <div className="flex items-start gap-2">
                            <AlertCircle size={14} className={`mt-0.5 flex-shrink-0 ${urgent ? 'text-red-400' : 'text-blue-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-800 font-medium leading-snug">{task.title}</p>
                              {task.lead && (
                                <Link href={`/crm/${task.lead.id}`} onClick={() => setShowNotifs(false)}
                                  className="text-xs text-blue-500 hover:underline">
                                  {task.lead.first_name} {task.lead.last_name}
                                </Link>
                              )}
                              <p className={`text-xs mt-0.5 ${urgent ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                                {dueText}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Recent notes */}
                {notifNotes.length > 0 && (
                  <div>
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-1.5">
                      <FileText size={11} className="text-gray-400" />
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Recent Notes (48h)</p>
                    </div>
                    {notifNotes.map(note => (
                      <Link
                        key={note.id}
                        href={`/crm/${note.lead.id}`}
                        onClick={() => setShowNotifs(false)}
                        className="flex items-start gap-2 px-4 py-3 border-b border-gray-50 hover:bg-gray-50"
                      >
                        <Clock size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-blue-600">{note.lead.first_name} {note.lead.last_name}</p>
                          <p className="text-sm text-gray-700 truncate">{note.content}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{timeAgo(note.created_at)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

                {!notifLoaded && (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-400">Loading...</p>
                  </div>
                )}

                {notifLoaded && totalNotifs === 0 && (
                  <div className="py-10 text-center">
                    <Bell size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-400">All caught up!</p>
                    <p className="text-xs text-gray-300 mt-0.5">No open tasks or recent notes</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 flex-shrink-0">
                <Link href="/tasks" onClick={() => setShowNotifs(false)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                  View all tasks →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
              {profile ? getInitials(profile.full_name) : 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-gray-500 capitalize leading-tight">{profile?.role ?? 'agent'}</p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
                <p className="text-xs text-gray-500">{profile?.email}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
