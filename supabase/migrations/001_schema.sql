-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'agent' CHECK (role IN ('admin', 'agent', 'assistant')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tags
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#6366F1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  lead_type TEXT NOT NULL DEFAULT 'Buyer' CHECK (lead_type IN ('Buyer', 'Seller', 'Investor', 'Past Client', 'Sphere')),
  lead_source TEXT,
  status TEXT NOT NULL DEFAULT 'New' CHECK (status IN ('New', 'Attempting Contact', 'Active', 'Nurture', 'Appointment Set', 'Client', 'Under Contract', 'Closed', 'Lost')),
  pipeline_stage TEXT DEFAULT 'New Lead' CHECK (pipeline_stage IN ('New Lead', 'Contacted', 'Appointment Set', 'Buyer Consultation', 'Seller Consultation', 'Active Client', 'Under Contract', 'Closed', 'Lost/Nurture')),
  deal_value DECIMAL(12, 2),
  expected_close_date DATE,
  assigned_agent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Tags junction
CREATE TABLE IF NOT EXISTS lead_tags (
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lead_id, tag_id)
);

-- Lead Notes
CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Activity
CREATE TABLE IF NOT EXISTS lead_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Plans
CREATE TABLE IF NOT EXISTS smart_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  trigger_type TEXT NOT NULL DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'new_lead', 'status_changed', 'tag_added', 'no_contact')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Plan Steps
CREATE TABLE IF NOT EXISTS smart_plan_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smart_plan_id UUID REFERENCES smart_plans(id) ON DELETE CASCADE NOT NULL,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('send_email', 'send_sms', 'create_task', 'wait', 'add_tag', 'remove_tag', 'change_status', 'internal_notification', 'assign_user', 'add_note', 'webhook')),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Smart Plan Enrollments
CREATE TABLE IF NOT EXISTS smart_plan_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smart_plan_id UUID REFERENCES smart_plans(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  current_step INTEGER DEFAULT 0,
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (smart_plan_id, lead_id)
);

-- Smart Plan Step Progress
CREATE TABLE IF NOT EXISTS smart_plan_step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID REFERENCES smart_plan_enrollments(id) ON DELETE CASCADE NOT NULL,
  step_id UUID REFERENCES smart_plan_steps(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'skipped')),
  executed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activity(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON smart_plan_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_plan ON smart_plan_enrollments(smart_plan_id);
CREATE INDEX IF NOT EXISTS idx_step_progress_enrollment ON smart_plan_step_progress(enrollment_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE OR REPLACE TRIGGER leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER smart_plans_updated_at BEFORE UPDATE ON smart_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_plan_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_plan_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_plan_step_progress ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Leads: authenticated users can CRUD
CREATE POLICY "leads_select" ON leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "leads_insert" ON leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "leads_update" ON leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "leads_delete" ON leads FOR DELETE TO authenticated USING (true);

-- Tags
CREATE POLICY "tags_select" ON tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "tags_insert" ON tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tags_update" ON tags FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tags_delete" ON tags FOR DELETE TO authenticated USING (true);

-- Lead tags
CREATE POLICY "lead_tags_select" ON lead_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "lead_tags_insert" ON lead_tags FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "lead_tags_delete" ON lead_tags FOR DELETE TO authenticated USING (true);

-- Notes
CREATE POLICY "notes_select" ON lead_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "notes_insert" ON lead_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notes_update" ON lead_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "notes_delete" ON lead_notes FOR DELETE TO authenticated USING (true);

-- Tasks
CREATE POLICY "tasks_select" ON tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE TO authenticated USING (true);

-- Activity
CREATE POLICY "activity_select" ON lead_activity FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_insert" ON lead_activity FOR INSERT TO authenticated WITH CHECK (true);

-- Smart plans
CREATE POLICY "smart_plans_select" ON smart_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "smart_plans_insert" ON smart_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "smart_plans_update" ON smart_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "smart_plans_delete" ON smart_plans FOR DELETE TO authenticated USING (true);

-- Smart plan steps
CREATE POLICY "steps_select" ON smart_plan_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "steps_insert" ON smart_plan_steps FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "steps_update" ON smart_plan_steps FOR UPDATE TO authenticated USING (true);
CREATE POLICY "steps_delete" ON smart_plan_steps FOR DELETE TO authenticated USING (true);

-- Enrollments
CREATE POLICY "enrollments_select" ON smart_plan_enrollments FOR SELECT TO authenticated USING (true);
CREATE POLICY "enrollments_insert" ON smart_plan_enrollments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "enrollments_update" ON smart_plan_enrollments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "enrollments_delete" ON smart_plan_enrollments FOR DELETE TO authenticated USING (true);

-- Step progress
CREATE POLICY "step_progress_select" ON smart_plan_step_progress FOR SELECT TO authenticated USING (true);
CREATE POLICY "step_progress_insert" ON smart_plan_step_progress FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "step_progress_update" ON smart_plan_step_progress FOR UPDATE TO authenticated USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'agent')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
