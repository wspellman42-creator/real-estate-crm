import { createClient } from '@/lib/supabase/server'
import { Users, TrendingUp, CheckSquare, Zap, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { formatCurrency, getStatusColor, timeAgo } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { count: totalLeads },
    { count: activeLeads },
    { count: pendingTasks },
    { count: activeEnrollments },
    { data: recentLeads },
    { data: upcomingTasks },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
    supabase.from('smart_plan_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('leads').select('*, assigned_agent:profiles(full_name)').order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('*, lead:leads(first_name, last_name)').eq('completed', false).order('due_date', { ascending: true }).limit(5),
  ])

  const stats = [
    { label: 'Total Leads', value: totalLeads ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/crm' },
    { label: 'Active Leads', value: activeLeads ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', href: '/crm?status=Active' },
    { label: 'Open Tasks', value: pendingTasks ?? 0, icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50', href: '/crm' },
    { label: 'Active Smart Plans', value: activeEnrollments ?? 0, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', href: '/automations' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href}>
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={20} className={color} />
                </div>
                <ArrowUpRight size={16} className="text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Leads</h2>
            <Link href="/crm" className="text-sm text-blue-600 hover:text-blue-700 font-medium">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {recentLeads?.map((lead) => (
              <Link key={lead.id} href={`/crm/${lead.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold flex-shrink-0">
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
                  <p className="text-xs text-gray-500">{lead.lead_type} · {timeAgo(lead.created_at)}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </Link>
            ))}
            {(!recentLeads || recentLeads.length === 0) && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No leads yet</div>
            )}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Upcoming Tasks</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingTasks?.map((task) => (
              <div key={task.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0 cursor-pointer hover:border-blue-500 transition-colors"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                  {task.lead && (
                    <p className="text-xs text-gray-500">
                      {(task.lead as { first_name: string; last_name: string }).first_name} {(task.lead as { first_name: string; last_name: string }).last_name}
                    </p>
                  )}
                </div>
                {task.due_date && (
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
            {(!upcomingTasks || upcomingTasks.length === 0) && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">No pending tasks</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
