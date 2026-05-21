-- Update last_contacted_at when a task is completed
CREATE OR REPLACE FUNCTION update_last_contacted_on_task_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS DISTINCT FROM TRUE) AND NEW.lead_id IS NOT NULL THEN
    UPDATE leads SET last_contacted_at = NOW() WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS task_complete_updates_last_contacted ON tasks;
CREATE TRIGGER task_complete_updates_last_contacted
  AFTER UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_last_contacted_on_task_complete();

-- Update last_contacted_at when a smart plan enrollment advances to the next step
CREATE OR REPLACE FUNCTION update_last_contacted_on_plan_step()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_step > OLD.current_step AND NEW.lead_id IS NOT NULL THEN
    UPDATE leads SET last_contacted_at = NOW() WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS plan_step_updates_last_contacted ON smart_plan_enrollments;
CREATE TRIGGER plan_step_updates_last_contacted
  AFTER UPDATE ON smart_plan_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_last_contacted_on_plan_step();
