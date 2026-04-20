
-- Function: Create in-app notification on new sale
CREATE OR REPLACE FUNCTION public.notify_on_new_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_business_name TEXT;
  v_currency TEXT;
BEGIN
  -- Get business info
  SELECT trading_name, currency INTO v_business_name, v_currency
  FROM businesses WHERE id = NEW.business_id;

  -- Create in-app notification
  INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'success',
    'New Sale Completed',
    'Sale of ' || v_currency || ' ' || to_char(NEW.total_amount, 'FM999,999,999.00') || ' via ' || COALESCE(NEW.payment_method, 'unknown') || ' payment.',
    'sale',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

-- Trigger for new sales
DROP TRIGGER IF EXISTS trigger_notify_on_new_sale ON sales;
CREATE TRIGGER trigger_notify_on_new_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_new_sale();

-- Function: Create in-app notification on approval request
CREATE OR REPLACE FUNCTION public.notify_on_approval_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.business_id,
      'warning',
      'Approval Required: ' || INITCAP(REPLACE(NEW.request_type, '_', ' ')),
      'A new ' || REPLACE(NEW.request_type, '_', ' ') || ' request needs your approval.' ||
        CASE WHEN NEW.amount IS NOT NULL THEN ' Amount: ₦' || to_char(NEW.amount, 'FM999,999,999.00') ELSE '' END,
      'approval',
      NEW.id::text
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.business_id,
      CASE WHEN NEW.status = 'approved' THEN 'success' ELSE 'error' END,
      'Request ' || INITCAP(NEW.status),
      'Your ' || REPLACE(NEW.request_type, '_', ' ') || ' request has been ' || NEW.status || '.' ||
        CASE WHEN NEW.notes IS NOT NULL THEN ' Note: ' || LEFT(NEW.notes, 100) ELSE '' END,
      'approval',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_approval_request ON approval_requests;
CREATE TRIGGER trigger_notify_on_approval_request
  AFTER INSERT OR UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_approval_request();

-- Function: Notify on stock transfer
CREATE OR REPLACE FUNCTION public.notify_on_stock_transfer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_name TEXT;
  v_from_branch TEXT;
  v_to_branch TEXT;
BEGIN
  SELECT name INTO v_product_name FROM products WHERE id = NEW.product_id;
  SELECT name INTO v_from_branch FROM branches WHERE id = NEW.from_branch_id;
  SELECT name INTO v_to_branch FROM branches WHERE id = NEW.to_branch_id;

  INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'info',
    'Stock Transfer',
    NEW.quantity || ' unit(s) of ' || COALESCE(v_product_name, 'Unknown') || ' transferred from ' || COALESCE(v_from_branch, 'Unknown') || ' to ' || COALESCE(v_to_branch, 'Unknown') || '.',
    'stock_transfer',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_stock_transfer ON stock_movements;
CREATE TRIGGER trigger_notify_on_stock_transfer
  AFTER INSERT ON stock_movements
  FOR EACH ROW
  WHEN (NEW.movement_type = 'transfer')
  EXECUTE FUNCTION notify_on_stock_transfer();

-- Function: Notify on leave request
CREATE OR REPLACE FUNCTION public.notify_on_leave_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff_name TEXT;
BEGIN
  SELECT name INTO v_staff_name FROM staff WHERE id = NEW.staff_id;

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
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_leave_request ON leave_requests;
CREATE TRIGGER trigger_notify_on_leave_request
  AFTER INSERT OR UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_leave_request();

-- Function: Notify on after-hours alert
CREATE OR REPLACE FUNCTION public.notify_on_after_hours_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
  VALUES (
    NEW.business_id,
    'warning',
    '⚠️ After Hours Alert',
    NEW.description || ' (Type: ' || NEW.alert_type || ')',
    'after_hours_alert',
    NEW.id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_after_hours_alert ON after_hours_alerts;
CREATE TRIGGER trigger_notify_on_after_hours_alert
  AFTER INSERT ON after_hours_alerts
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_after_hours_alert();

-- Function: Notify on low stock (when product stock_quantity is updated below threshold)
CREATE OR REPLACE FUNCTION public.notify_on_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only trigger when stock goes below threshold (and wasn't already below)
  IF NEW.low_stock_threshold IS NOT NULL 
     AND NEW.stock_quantity <= NEW.low_stock_threshold
     AND (OLD.stock_quantity > OLD.low_stock_threshold OR OLD.stock_quantity IS NULL) THEN
    
    INSERT INTO business_notifications (business_id, type, title, message, entity_type, entity_id)
    VALUES (
      NEW.business_id,
      'warning',
      'Low Stock: ' || NEW.name,
      NEW.name || ' has only ' || NEW.stock_quantity || ' units remaining (threshold: ' || NEW.low_stock_threshold || ').',
      'low_stock',
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_on_low_stock ON products;
CREATE TRIGGER trigger_notify_on_low_stock
  AFTER UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_low_stock();
