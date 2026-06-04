import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, TrendingUp, CheckSquare, Zap, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { GlobalTask } from '@/lib/types'
import DashboardTasks from '@/components/dashboard/DashboardTasks'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentUser } = await supabase.from('users').select('role').eq('id', user?.id ?? '').single()
  if (currentUser?.role !== 'admin') redirect('/crm')

  const [
    { count: totalLeads },
    { count: activeLeads },
    { count: pendingTasks },
    { count: activeEnrollments },
    { data: tasks },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('completed', false),
    supabase.from('smart_plan_enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase
      .from('tasks')
      .select('*, lead:leads(id, first_name, last_name)')
      .order('due_date', { ascending: true, nullsFirst: false }),
  ])

  const stats = [
    { label: 'Total Leads', value: totalLeads ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/crm' },
    { label: 'Active Leads', value: activeLeads ?? 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', href: '/crm?status=Active' },
    { label: 'Open Tasks', value: pendingTasks ?? 0, icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50', href: '/tasks' },
    { label: 'Active Smart Plans', value: activeEnrollments ?? 0, icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50', href: '/automations' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
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

      {/* Task panels — client component with realtime sync */}
      <DashboardTasks initialTasks={(tasks ?? []) as GlobalTask[]} />
    </div>
  )
}
