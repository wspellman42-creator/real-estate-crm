'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Lead } from '@/lib/types'
import { getStatusColor, LEAD_STATUSES, LEAD_TYPES, LEAD_SOURCES, timeAgo, formatDate } from '@/lib/utils'
import { Search, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LeadsTableProps {
  leads: Lead[]
  agents: { id: string; full_name: string }[]
  totalCount: number
  page: number
  totalPages: number
  pageSize: number
  currentFilters: {
    search: string
    status: string
    type: string
    source: string
    pipeline: string
    agent: string
    sort: string
    dir: string
  }
}

type SortKey = 'name' | 'status' | 'pipeline_type' | 'lead_source' | 'created_at' | 'last_contacted_at'

function SortIcon({ col, active, dir }: { col: string; active: boolean; dir: string }) {
  if (!active) return <ChevronsUpDown size={12} className="ml-1 text-gray-300 inline" />
  return dir === 'asc'
    ? <ChevronUp size={12} className="ml-1 text-blue-500 inline" />
    : <ChevronDown size={12} className="ml-1 text-blue-500 inline" />
}

export default function LeadsTable({
  leads, agents, totalCount, page, totalPages, pageSize, currentFilters
}: LeadsTableProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()
  const [searchInput, setSearchInput] = useState(currentFilters.search)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const supabase = createClient()

  function buildUrl(overrides: Record<string, string>) {
    const params = new URLSearchParams({
      ...(currentFilters.search && { search: currentFilters.search }),
      ...(currentFilters.status && { status: currentFilters.status }),
      ...(currentFilters.type && { type: currentFilters.type }),
      ...(currentFilters.source && { source: currentFilters.source }),
      ...(currentFilters.pipeline && { pipeline: currentFilters.pipeline }),
      ...(currentFilters.agent && { agent: currentFilters.agent }),
      ...(currentFilters.sort !== 'created_at' && { sort: currentFilters.sort }),
      ...(currentFilters.dir !== 'desc' && { dir: currentFilters.dir }),
    })
    Object.entries(overrides).forEach(([k, v]) => {
      if (v) params.set(k, v)
      else params.delete(k)
    })
    // Reset to page 1 on filter/sort change (unless explicitly setting page)
    if (!('page' in overrides)) params.delete('page')
    const qs = params.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }

  function navigate(overrides: Record<string, string>) {
    startTransition(() => router.push(buildUrl(overrides)))
  }

  function handleSort(col: SortKey) {
    const newDir = currentFilters.sort === col && currentFilters.dir === 'asc' ? 'desc' : 'asc'
    navigate({ sort: col, dir: newDir })
  }

  function handleFilter(key: string, value: string) {
    navigate({ [key]: value })
  }

  function clearFilters() {
    startTransition(() => router.push(pathname))
    setSearchInput('')
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== currentFilters.search) {
        navigate({ search: searchInput })
      }
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Keep search input in sync if filters cleared externally
  useEffect(() => { setSearchInput(currentFilters.search) }, [currentFilters.search])

  async function deleteLead(id: string) {
    await supabase.from('leads').delete().eq('id', id)
    setConfirmDeleteId(null)
    startTransition(() => router.refresh())
  }

  const hasFilters = !!(currentFilters.search || currentFilters.status || currentFilters.type ||
    currentFilters.source || currentFilters.pipeline || currentFilters.agent)

  function ColHeader({ label, col }: { label: string; col: SortKey }) {
    return (
      <th
        onClick={() => handleSort(col)}
        className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
      >
        {label}
        <SortIcon col={col} active={currentFilters.sort === col} dir={currentFilters.dir} />
      </th>
    )
  }

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalCount)

  return (
    <div className={`bg-white rounded-xl border border-gray-200 transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      {/* Filters */}
      <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search leads..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select value={currentFilters.status} onChange={e => handleFilter('status', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Statuses</option>
          {LEAD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={currentFilters.type} onChange={e => handleFilter('type', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Types</option>
          {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <select value={currentFilters.source} onChange={e => handleFilter('source', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Sources</option>
          {LEAD_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={currentFilters.pipeline} onChange={e => handleFilter('pipeline', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Pipelines</option>
          <option value="personal">Personal</option>
          <option value="company">Company</option>
        </select>

        <select value={currentFilters.agent} onChange={e => handleFilter('agent', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
          <option value="">All Agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.full_name}</option>)}
        </select>

        {hasFilters && (
          <button onClick={clearFilters}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1">
            <X size={13} /> Clear
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
              <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3 uppercase tracking-wide">Agent</th>
              <ColHeader label="Added Date" col="created_at" />
              <ColHeader label="Last Contact" col="last_contacted_at" />
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leads.map(lead => (
              <tr key={lead.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-4 py-3.5">
                  <Link href={`/crm/${lead.id}`} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold flex-shrink-0">
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
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
                      lead.pipeline_type === 'company' ? 'bg-purple-100 text-purple-700' : 'bg-pink-100 text-pink-700'
                    }`}>
                      {lead.pipeline_type === 'company' ? 'Company' : 'Personal'}
                    </span>
                  ) : <span className="text-sm text-gray-400">—</span>}
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

        {leads.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">{hasFilters ? 'No leads match your filters' : 'No leads yet'}</p>
          </div>
        )}
      </div>

      {/* Footer: count + pagination */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {totalCount === 0 ? 'No leads' : `${from}–${to} of ${totalCount.toLocaleString()} leads`}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={15} />
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show first, last, current ±1, and ellipses
              let pg: number | null = null
              if (totalPages <= 7) pg = i + 1
              else if (i === 0) pg = 1
              else if (i === 6) pg = totalPages
              else if (i === 1 && page > 4) pg = null // ellipsis
              else if (i === 5 && page < totalPages - 3) pg = null // ellipsis
              else pg = Math.max(2, Math.min(totalPages - 1, page - 2 + i))

              if (pg === null) return <span key={i} className="px-1 text-gray-300 text-xs">…</span>
              return (
                <button
                  key={i}
                  onClick={() => navigate({ page: String(pg) })}
                  className={`w-7 h-7 rounded text-xs font-medium ${pg === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  {pg}
                </button>
              )
            })}
            <button
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
