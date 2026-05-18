-- Seed Tags
INSERT INTO tags (id, name, color) VALUES
  ('11111111-0000-0000-0000-000000000001', 'Hot Lead', '#EF4444'),
  ('11111111-0000-0000-0000-000000000002', 'VIP', '#F59E0B'),
  ('11111111-0000-0000-0000-000000000003', 'Referral', '#10B981'),
  ('11111111-0000-0000-0000-000000000004', 'First Time Buyer', '#3B82F6'),
  ('11111111-0000-0000-0000-000000000005', 'Investor', '#8B5CF6'),
  ('11111111-0000-0000-0000-000000000006', 'Pre-Approved', '#06B6D4'),
  ('11111111-0000-0000-0000-000000000007', 'Cash Buyer', '#22C55E')
ON CONFLICT DO NOTHING;

-- Smart Plans
INSERT INTO smart_plans (id, name, description, category, trigger_type, is_active) VALUES
  ('22222222-0000-0000-0000-000000000001', 'New Lead Welcome', 'Welcome sequence for new leads - 5 day follow up', 'Lead Nurture', 'new_lead', true),
  ('22222222-0000-0000-0000-000000000002', 'Buyer Drip Campaign', '30-day buyer nurture email sequence', 'Buyer', 'manual', true),
  ('22222222-0000-0000-0000-000000000003', 'Seller Market Update', 'Monthly market reports for potential sellers', 'Seller', 'manual', true),
  ('22222222-0000-0000-0000-000000000004', 'Past Client Check-In', 'Annual check-in for past clients', 'Past Client', 'manual', true),
  ('22222222-0000-0000-0000-000000000005', 'No Contact Follow-Up', 'Re-engagement plan for stale leads', 'Re-engagement', 'no_contact', true)
ON CONFLICT DO NOTHING;

-- Smart Plan Steps for New Lead Welcome
INSERT INTO smart_plan_steps (smart_plan_id, step_order, step_type, name, config) VALUES
  ('22222222-0000-0000-0000-000000000001', 1, 'send_email', 'Welcome Email', '{"subject": "Welcome! We''re here to help", "template": "welcome"}'),
  ('22222222-0000-0000-0000-000000000001', 2, 'create_task', 'Call New Lead', '{"title": "Call new lead within 24 hours", "due_offset_hours": 24}'),
  ('22222222-0000-0000-0000-000000000001', 3, 'wait', 'Wait 2 Days', '{"days": 2}'),
  ('22222222-0000-0000-0000-000000000001', 4, 'send_email', 'Follow-Up Email', '{"subject": "Still thinking about buying/selling?", "template": "followup_1"}'),
  ('22222222-0000-0000-0000-000000000001', 5, 'wait', 'Wait 3 Days', '{"days": 3}'),
  ('22222222-0000-0000-0000-000000000001', 6, 'create_task', 'Second Follow-Up Call', '{"title": "Second follow-up call", "due_offset_hours": 0}'),
  ('22222222-0000-0000-0000-000000000001', 7, 'change_status', 'Update Status', '{"new_status": "Attempting Contact"}')
ON CONFLICT DO NOTHING;

-- Smart Plan Steps for Buyer Drip
INSERT INTO smart_plan_steps (smart_plan_id, step_order, step_type, name, config) VALUES
  ('22222222-0000-0000-0000-000000000002', 1, 'send_email', 'Buyer Guide', '{"subject": "Your Complete Home Buying Guide", "template": "buyer_guide"}'),
  ('22222222-0000-0000-0000-000000000002', 2, 'wait', 'Wait 7 Days', '{"days": 7}'),
  ('22222222-0000-0000-0000-000000000002', 3, 'send_email', 'Mortgage Tips', '{"subject": "5 Things to Know Before Getting Pre-Approved", "template": "mortgage_tips"}'),
  ('22222222-0000-0000-0000-000000000002', 4, 'wait', 'Wait 7 Days', '{"days": 7}'),
  ('22222222-0000-0000-0000-000000000002', 5, 'send_email', 'Neighborhood Guide', '{"subject": "Top Neighborhoods to Consider", "template": "neighborhoods"}'),
  ('22222222-0000-0000-0000-000000000002', 6, 'add_tag', 'Tag as Nurtured', '{"tag": "Nurtured"}'),
  ('22222222-0000-0000-0000-000000000002', 7, 'create_task', 'Check In Call', '{"title": "Buyer drip follow-up call", "due_offset_hours": 0}')
ON CONFLICT DO NOTHING;
