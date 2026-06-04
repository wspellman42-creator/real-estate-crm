'use client'

interface Props {
  stats: {
    totalLeads: number
    activeLeads: number
    closedLeads: number
    totalTasks: number
    completedTasks: number
  }
  sourceMap: Record<string, number>
  statusMap: Record<string, number>
  monthlyLeads: { month: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  'New': '#3B82F6',
  'Attempting Contact': '#F59E0B',
  'Active': '#10B981',
  'Nurture': '#8B5CF6',
  'Appointment Set': '#6366F1',
  'Client': '#059669',
  'Under Contract': '#F97316',
  'Closed': '#22C55E',
  'Lost': '#EF4444',
}

const SOURCE_COLORS = ['#2563eb','#10b981','#f59e0b','#8b5cf6','#f97316','#ec4899','#06b6d4','#84cc16','#ef4444','#6b7280']

export default function ReportingView({ stats, sourceMap, statusMap, monthlyLeads }: Props) {
  const maxMonthly = Math.max(...monthlyLeads.map(m => m.count), 1)
  const taskRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0
  const closeRate = stats.totalLeads > 0 ? Math.round((stats.closedLeads / stats.totalLeads) * 100) : 0

  const sourcePairs = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])
  const totalSourced = sourcePairs.reduce((s, [, v]) => s + v, 0)

  const statusPairs = Object.entries(statusMap).sort((a, b) => b[1] - a[1])

  const funnelStages = [
    { label: 'Total Leads', value: stats.totalLeads, color: '#2563eb' },
    { label: 'Active', value: stats.activeLeads, color: '#10b981' },
    { label: 'Client', value: statusMap['Client'] ?? 0, color: '#6366F1' },
    { label: 'Under Contract', value: statusMap['Under Contract'] ?? 0, color: '#f97316' },
    { label: 'Closed', value: stats.closedLeads, color: '#22c55e' },
  ]
  const maxFunnel = Math.max(funnelStages[0].value, 1)

  return (
    <div className="space-y-5">
      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Leads', value: stats.totalLeads, sub: 'All time', color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Active Leads', value: stats.activeLeads, sub: `${stats.totalLeads > 0 ? Math.round(stats.activeLeads/stats.totalLeads*100) : 0}% of total`, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Closed Deals', value: stats.closedLeads, sub: `${closeRate}% close rate`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tasks Created', value: stats.totalTasks, sub: 'All time', color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Task Completion', value: `${taskRate}%`, sub: `${stats.completedTasks} done`, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map(({ label, value, sub, color, bg }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className={`inline-flex items-center justify-center w-8 h-8 ${bg} rounded-lg mb-2`}>
              <span className={`text-xs font-bold ${color}`}>{typeof value === 'number' ? (value > 999 ? `${(value/1000).toFixed(1)}k` : value) : value}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Lead Volume Bar Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Lead Volume — Last 6 Months</h3>
          <div className="flex items-end gap-3 h-36">
            {monthlyLeads.map(({ month, count }, i) => {
              const heightPct = maxMonthly > 0 ? (count / maxMonthly) * 100 : 0
              const isLast = i === monthlyLeads.length - 1
              return (
                <div key={month} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-xs font-semibold text-gray-600">{count}</span>
                  <div
                    className={`w-full rounded-t-md transition-all ${isLast ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                  />
                  <span className="text-xs text-gray-400">{month}{isLast ? '*' : ''}</span>
                </div>
              )
            })}
          </div>
          {monthlyLeads[monthlyLeads.length - 1] && (
            <p className="text-xs text-gray-400 mt-2">* current month (partial)</p>
          )}
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Lead Sources</h3>
          {sourcePairs.length > 0 ? (
            <div className="space-y-2.5">
              {sourcePairs.slice(0, 8).map(([source, count], i) => {
                const pct = totalSourced > 0 ? Math.round((count / totalSourced) * 100) : 0
                return (
                  <div key={source} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{source}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No source data yet</p>
          )}
        </div>

        {/* Pipeline Funnel */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Pipeline Funnel</h3>
          <div className="space-y-2.5">
            {funnelStages.map(({ label, value, color }) => {
              const pct = maxFunnel > 0 ? (value / maxFunnel) * 100 : 0
              return (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-28 flex-shrink-0">{label}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="h-full rounded-md flex items-center px-2 transition-all"
                      style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: color }}
                    >
                      {value > 0 && <span className="text-xs font-bold text-white">{value}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Lead Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 text-sm mb-4">Status Breakdown</h3>
          {statusPairs.length > 0 ? (
            <div className="space-y-2">
              {statusPairs.map(([status, count]) => {
                const pct = stats.totalLeads > 0 ? Math.round((count / stats.totalLeads) * 100) : 0
                const color = STATUS_COLORS[status] ?? '#6b7280'
                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-600 flex-1">{status}</span>
                    <span className="text-xs font-semibold text-gray-700">{count}</span>
                    <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-8 text-center">No leads yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
