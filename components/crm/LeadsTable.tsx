'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Lead } from '@/lib/types'
import { getStatusColor, LEAD_STATUSES, LEAD_TYPES, timeAgo, formatCurrency } from '@/lib/utils'
import { Search, Filter, Trash2, SlidersHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeadsTableProps {
  leads: Lead[]
  agents: { id: string; full_name: string }[]
}

export default function LeadsTable({ leads, agents }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const filtered = useMemo(() => {
    return leads.filter(lead => {
      const name = `${lead.first_name} ${lead.last_name}`.toLowerCase()
      if (search && !name.includes(search.toLowerCase()) && 
          !lead.email?.toLowerCase().includes(search.toLowerCase()) &&
          !lead.phone?.includes(search)) return false
      if (statusFilter && lead.status !== statusFilter) return false
      if (typeFilter && lead.lead_type !== typeFilter) return false
      if (agentFilter && lead.assigned_agent_id !== agentFilter) return false
      return true
    })
  }, [leads, search, statusFilter, typeFilter, agentFilter])

  async function deleteLead(id: string) {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          <option value="">All Types</option>
          {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={agentFilter}
          onChange={e => setAgentFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
        >
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>

        {(statusFilter || typeFilter || agentFilter || search) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setAgentFilter('') }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3 uppercase tracking-wide">Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Type</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide hidden md:table-cell">Agent</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide hidden lg:table-cell">Last Contact</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide hidden lg:table-cell">Smart Plans</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-5 py-3.5">
                  <Link href={`/crm/${lead.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                      {lead.first_name[0]}{lead.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                        {lead.first_name} {lead.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{lead.email || lead.phone || '—'}</p>
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md font-medium">{lead.lead_type}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden md:table-cell">
                  <span className="text-sm text-gray-600">
                    {lead.assigned_agent ? (lead.assigned_agent as { full_name: string }).full_name : '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  <span className="text-sm text-gray-500">{timeAgo(lead.last_contacted_at)}</span>
                </td>
                <td className="px-4 py-3.5 hidden lg:table-cell">
                  {lead.active_smart_plans && lead.active_smart_plans.length > 0 ? (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
                      {lead.active_smart_plans.length} active
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => deleteLead(lead.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No leads found</p>
          </div>
        )}
      </div>

      <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
        Showing {filtered.length} of {leads.length} leads
      </div>
    </div>
  )
}
