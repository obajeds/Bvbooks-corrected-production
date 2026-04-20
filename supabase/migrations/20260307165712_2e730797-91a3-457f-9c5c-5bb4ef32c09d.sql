
CREATE OR REPLACE FUNCTION public.update_pump_meter_on_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Submit: pending → submitted → advance meter to closing
  IF NEW.status = 'submitted' AND OLD.status = 'pending' THEN
    UPDATE pumps
    SET current_meter_reading = NEW.closing_meter,
        updated_at = now()
    WHERE id = NEW.pump_id;
  -- Reopen: submitted → pending → revert meter to opening
  ELSIF NEW.status = 'pending' AND OLD.status = 'submitted' THEN
    UPDATE pumps
    SET current_meter_reading = NEW.opening_meter,
        updated_at = now()
    WHERE id = NEW.pump_id;
  END IF;
  RETURN NEW;
END;
$$;
