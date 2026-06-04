'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  TrendingUp,
  Zap,
  Settings,
  Building2,
  CheckSquare,
  Calendar,
  Home,
  BarChart2,
  UserCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const adminNavItems = [
  { section: 'Main', items: [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  ]},
  { section: 'CRM', items: [
    { href: '/crm', icon: Users, label: 'Leads' },
    { href: '/my-leads', icon: UserCircle, label: 'My Leads' },
    { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { href: '/calendar', icon: Calendar, label: 'Calendar' },
    { href: '/sales', icon: TrendingUp, label: 'Sales Pipeline' },
  ]},
  { section: 'Properties', items: [
    { href: '/listings', icon: Home, label: 'Listings' },
  ]},
  { section: 'Analytics', items: [
    { href: '/reporting', icon: BarChart2, label: 'Reporting' },
  ]},
  { section: 'System', items: [
    { href: '/automations', icon: Zap, label: 'Automations' },
    { href: '/settings', icon: Settings, label: 'Settings' },
  ]},
]

const agentNavItems = [
  { section: 'CRM', items: [
    { href: '/crm', icon: Users, label: 'Leads' },
    { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { href: '/calendar', icon: Calendar, label: 'Calendar' },
    { href: '/sales', icon: TrendingUp, label: 'Sales Pipeline' },
  ]},
  { section: 'Properties', items: [
    { href: '/listings', icon: Home, label: 'Listings' },
  ]},
  { section: 'System', items: [
    { href: '/automations', icon: Zap, label: 'Automations' },
  ]},
]

export default function Sidebar({ role }: { role: string }) {
  const pathname = usePathname()
  const sections = role === 'admin' ? adminNavItems : agentNavItems

  return (
    <div className="w-56 flex-shrink-0 flex flex-col" style={{ backgroundColor: '#1a1f2e' }}>
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">PropFlow</p>
            <p className="text-blue-400 text-xs leading-tight">CRM</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {sections.map(({ section, items }) => (
          <div key={section} className="mb-4">
            <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{section}</p>
            <div className="space-y-0.5">
              {items.map(({ href, icon: Icon, label }) => {
                const isActive = href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                    )}
                  >
                    <Icon size={16} />
                    {label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 rounded-lg bg-white/5">
          <p className="text-xs text-gray-500">Version 2.0.0</p>
        </div>
      </div>
    </div>
  )
}
