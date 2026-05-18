export type UserRole = 'admin' | 'agent' | 'assistant'

export type LeadType = 'Buyer' | 'Seller' | 'Investor' | 'Past Client' | 'Sphere'

export type LeadStatus =
  | 'New'
  | 'Attempting Contact'
  | 'Active'
  | 'Nurture'
  | 'Appointment Set'
  | 'Client'
  | 'Under Contract'
  | 'Closed'
  | 'Lost'

export type PipelineStage =
  | 'New Lead'
  | 'Contacted'
  | 'Appointment Set'
  | 'Buyer Consultation'
  | 'Seller Consultation'
  | 'Active Client'
  | 'Under Contract'
  | 'Closed'
  | 'Lost/Nurture'

export type SmartPlanTrigger =
  | 'manual'
  | 'new_lead'
  | 'status_changed'
  | 'tag_added'
  | 'no_contact'

export type StepType =
  | 'send_email'
  | 'send_sms'
  | 'create_task'
  | 'wait'
  | 'add_tag'
  | 'remove_tag'
  | 'change_status'
  | 'internal_notification'
  | 'assign_user'
  | 'add_note'
  | 'webhook'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

export interface Lead {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  lead_type: LeadType
  lead_source?: string
  status: LeadStatus
  pipeline_stage?: PipelineStage
  deal_value?: number
  expected_close_date?: string
  assigned_agent_id?: string
  assigned_agent?: Profile
  last_contacted_at?: string
  tags?: Tag[]
  notes?: LeadNote[]
  tasks?: Task[]
  active_smart_plans?: SmartPlanEnrollment[]
  created_at: string
  updated_at: string
}

export interface Tag {
  id: string
  name: string
  color: string
  created_at: string
}

export interface LeadNote {
  id: string
  lead_id: string
  author_id: string
  author?: Profile
  content: string
  created_at: string
}

export interface Task {
  id: string
  lead_id: string
  assigned_to_id?: string
  assigned_to?: Profile
  title: string
  description?: string
  due_date?: string
  completed: boolean
  completed_at?: string
  created_at: string
}

export interface LeadActivity {
  id: string
  lead_id: string
  user_id?: string
  user?: Profile
  activity_type: string
  description: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface SmartPlan {
  id: string
  name: string
  description?: string
  category?: string
  trigger_type: SmartPlanTrigger
  is_active: boolean
  steps?: SmartPlanStep[]
  enrollment_count?: number
  created_at: string
  updated_at: string
}

export interface SmartPlanStep {
  id: string
  smart_plan_id: string
  step_order: number
  step_type: StepType
  name: string
  config: Record<string, unknown>
  created_at: string
}

export interface SmartPlanEnrollment {
  id: string
  smart_plan_id: string
  smart_plan?: SmartPlan
  lead_id: string
  lead?: Lead
  status: 'active' | 'paused' | 'completed' | 'failed'
  current_step: number
  enrolled_at: string
  completed_at?: string
  step_progress?: SmartPlanStepProgress[]
}

export interface SmartPlanStepProgress {
  id: string
  enrollment_id: string
  step_id: string
  step?: SmartPlanStep
  status: 'pending' | 'completed' | 'failed' | 'skipped'
  executed_at?: string
  error?: string
}
