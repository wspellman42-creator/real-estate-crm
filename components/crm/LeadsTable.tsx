'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Lead } from '@/lib/types'
import { getStatusColor, LEAD_STATUSES, LEAD_TYPES, LEAD_SOURCES, timeAgo, formatDate } from '@/lib/utils'
import { Search, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, AlertTriangle, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LeadsTableProps {
  leads: Lead[]
  agents: { id: string; full_name: string }[]
}

type SortKey = 'name' | 'status' | 'pipeline_type' | 'lead_source' | 'created_at' | 'last_contacted_at' | 'agent'
type SortDir = 'asc' | 'desc'

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown size={12} className="ml-1 text-gray-300 inline" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="ml-1 text-blue-500 inline" />
    : <ChevronDown size={12} className="ml-1 text-blue-500 inline" />
}

export default function LeadsTable({ leads, agents }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')
  const [pipelineFilter, setPipelineFilter] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const filtered = useMemo(() => {
    let result = leads.filter(lead => {
      const name = `${lead.first_name} ${lead.last_name}`.toLowerCase()
      if (search && !name.includes(search.toLowerCase()) &&
          !lead.email?.toLowerCase().includes(search.toLowerCase()) &&
          !lead.phone?.includes(search)) return false
      if (statusFilter && lead.status !== statusFilter) return false
      if (typeFilter && lead.lead_type !== typeFilter) return false
      if (agentFilter && lead.assigned_agent_id !== agentFilter) return false
      if (sourceFilter && lead.lead_source !== sourceFilter) return false
      if (pipelineFilter && lead.pipeline_type !== pipelineFilter) return false
      return true
    })

    result = [...result].sort((a, b) => {
      let av = '', bv = ''
      switch (sortKey) {
        case 'name': av = `${a.first_name} ${a.last_name}`; bv = `${b.first_name} ${b.last_name}`; break
        case 'status': av = a.status; bv = b.status; break
        case 'pipeline_type': av = a.pipeline_type ?? ''; bv = b.pipeline_type ?? ''; break
        case 'lead_source': av = a.lead_source ?? ''; bv = b.lead_source ?? ''; break
        case 'created_at': av = a.created_at; bv = b.created_at; break
        case 'last_contacted_at': av = a.last_contacted_at ?? ''; bv = b.last_contacted_at ?? ''; break
        case 'agent':
          av = (a.assigned_agent as { full_name?: string } | undefined)?.full_name ?? ''
          bv = (b.assigned_agent as { full_name?: string } | undefined)?.full_name ?? ''
          break
      }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })

    return result
  }, [leads, search, statusFilter, typeFilter, agentFilter, sourceFilter, pipelineFilter, sortKey, sortDir])

  async function deleteLead(id: string) {
    await supabase.from('leads').delete().eq('id', id)
    setConfirmDeleteId(null)
    router.refresh()
  }

  function ColHeader({ label, col }: { label: string; col: SortKey }) {
    return (
      <th
        onClick={() => handleSort(col)}
        className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
      >
        {label}
        <SortIcon col={col} active={sortKey === col} dir={sortDir} />
      </th>
    )
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

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Types</option>
          {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={pipelineFilter} onChange={e => setPipelineFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Pipelines</option>
          <option value="personal">Personal</option>
          <option value="company">Company</option>
        </select>

        <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>

        {(statusFilter || typeFilter || agentFilter || search || sourceFilter || pipelineFilter) && (
          <button
            onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setAgentFilter(''); setSourceFilter(''); setPipelineFilter('') }}
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
              <ColHeader label="Name" col="name" />
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Type</th>
              <ColHeader label="Status" col="status" />
              <ColHeader label="Pipeline" col="pipeline_type" />
              <ColHeader label="Source" col="lead_source" />
              <ColHeader label="Agent" col="agent" />
              <ColHeader label="Added Date" col="created_at" />
              <ColHeader label="Last Contact" col="last_contacted_at" />
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3.5">
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
                <td className="px-4 py-3.5">
                  {lead.pipeline_type ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      lead.pipeline_type === 'company'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-pink-100 text-pink-700'
                    }`}>
                      {lead.pipeline_type === 'company' ? 'Company' : 'Personal'}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-500">{lead.lead_source || '—'}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm text-gray-600">
                    {lead.assigned_agent ? (lead.assigned_agent as { full_name: string }).full_name : '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{formatDate(lead.created_at)}</span>
                </td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{timeAgo(lead.last_contacted_at)}</span>
                </td>
                <td className="px-4 py-3.5">
                  {confirmDeleteId === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => deleteLead(lead.id)} className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 font-medium">Delete</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={13} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(lead.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
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
