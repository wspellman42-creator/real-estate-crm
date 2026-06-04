CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_agent_id ON leads(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_lead_source ON leads(lead_source);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_type ON leads(pipeline_type);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type ON leads(lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at ON leads(last_contacted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_name ON leads(first_name, last_name);
