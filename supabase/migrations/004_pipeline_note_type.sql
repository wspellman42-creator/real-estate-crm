-- Add pipeline_type to leads (company or personal)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS pipeline_type TEXT DEFAULT 'personal' CHECK (pipeline_type IN ('company', 'personal'));

-- Add note_type to lead_notes (for activity logging)
ALTER TABLE lead_notes ADD COLUMN IF NOT EXISTS note_type TEXT DEFAULT 'note' CHECK (note_type IN ('call', 'text', 'email', 'showing', 'doc', 'note'));

-- Enable realtime for tasks table so cross-page sync works
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE lead_notes;
