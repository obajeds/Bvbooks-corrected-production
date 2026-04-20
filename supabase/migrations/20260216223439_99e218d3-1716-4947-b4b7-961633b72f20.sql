CREATE OR REPLACE FUNCTION public.notify_on_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff_name TEXT;
BEGIN
  SELECT full_name INTO v_staff_name FROM staff WHERE id = NEW.staff_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.business_id,
      'info',
      'Leave Request',
      COALESCE(v_staff_name, 'A staff member') || ' has requested ' || COALESCE(NEW.leave_type, '') || ' leave from ' || to_char(NEW.start_date::date, 'Mon DD') || ' to ' || to_char(NEW.end_date::date, 'Mon DD') || '.',
      'leave_request',
      NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.business_id,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END,
      'Leave ' || INITCAP(NEW.status),
      'Leave request for ' || COALESCE(v_staff_name, 'staff') || ' has been ' || NEW.status || '.',
      'leave_request',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$function$;