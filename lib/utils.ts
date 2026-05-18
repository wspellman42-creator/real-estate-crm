import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { LeadStatus, PipelineStage } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: LeadStatus): string {
  const colors: Record<LeadStatus, string> = {
    'New': 'bg-blue-100 text-blue-700',
    'Attempting Contact': 'bg-yellow-100 text-yellow-700',
    'Active': 'bg-green-100 text-green-700',
    'Nurture': 'bg-purple-100 text-purple-700',
    'Appointment Set': 'bg-indigo-100 text-indigo-700',
    'Client': 'bg-emerald-100 text-emerald-700',
    'Under Contract': 'bg-orange-100 text-orange-700',
    'Closed': 'bg-gray-100 text-gray-700',
    'Lost': 'bg-red-100 text-red-700',
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export function getStageColor(stage: PipelineStage): string {
  const colors: Record<PipelineStage, string> = {
    'New Lead': '#3B82F6',
    'Contacted': '#8B5CF6',
    'Appointment Set': '#F59E0B',
    'Buyer Consultation': '#10B981',
    'Seller Consultation': '#06B6D4',
    'Active Client': '#6366F1',
    'Under Contract': '#F97316',
    'Closed': '#22C55E',
    'Lost/Nurture': '#EF4444',
  }
  return colors[stage] || '#6B7280'
}

export function formatCurrency(value?: number): string {
  if (!value) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(date?: string): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(date?: string): string {
  if (!date) return 'Never'
  const now = new Date()
  const d = new Date(date)
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'New Lead',
  'Contacted',
  'Appointment Set',
  'Buyer Consultation',
  'Seller Consultation',
  'Active Client',
  'Under Contract',
  'Closed',
  'Lost/Nurture',
]

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Attempting Contact',
  'Active',
  'Nurture',
  'Appointment Set',
  'Client',
  'Under Contract',
  'Closed',
  'Lost',
]

export const LEAD_TYPES = ['Buyer', 'Seller', 'Investor', 'Past Client', 'Sphere'] as const
export const LEAD_SOURCES = ['Website', 'Referral', 'Zillow', 'Realtor.com', 'Social Media', 'Open House', 'Cold Call', 'Direct Mail', 'Other'] as const
