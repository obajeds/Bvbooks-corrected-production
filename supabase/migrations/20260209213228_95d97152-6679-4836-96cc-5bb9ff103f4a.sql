
-- Enable pg_net extension for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Function: Send event email notification via edge function
CREATE OR REPLACE FUNCTION public.send_event_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
  v_anon_key TEXT;
  v_payload JSONB;
  v_business_id UUID;
  v_event_type TEXT;
BEGIN
  v_supabase_url := current_setting('app.settings.supabase_url', true);
  v_anon_key := current_setting('app.settings.supabase_anon_key', true);
  
  -- If settings not available, use environment-based approach
  IF v_supabase_url IS NULL OR v_supabase_url = '' THEN
    v_supabase_url := 'https://qarkrmokbgyeeieefjbf.supabase.co';
  END IF;
  IF v_anon_key IS NULL OR v_anon_key = '' THEN
    v_anon_key := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcmtybW9rYmd5ZWVpZWVmamJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODUyMzAsImV4cCI6MjA3NDA2MTIzMH0.62Y5nRYb8FOo6Uy7iB7mwr9JXXf0jntfFdrezUNJUH0';
  END IF;

  -- Determine event type and build payload based on trigger table
  IF TG_TABLE_NAME = 'approval_requests' THEN
    v_business_id := NEW.business_id;
    IF TG_OP = 'INSERT' THEN
      v_event_type := 'approval_request';
      v_payload := jsonb_build_object(
        'type', 'approval_request',
        'businessId', NEW.business_id,
        'data', jsonb_build_object(
          'requestType', NEW.request_type,
          'amount', NEW.amount
        )
      );
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
      v_event_type := 'approval_resolved';
      v_payload := jsonb_build_object(
        'type', 'approval_resolved',
        'businessId', NEW.business_id,
        'data', jsonb_build_object(
          'requestType', NEW.request_type,
          'status', NEW.status,
          'notes', NEW.notes,
          'amount', NEW.amount
        )
      );
    ELSE
      RETURN NEW;
    END IF;

  ELSIF TG_TABLE_NAME = 'after_hours_alerts' THEN
    v_business_id := NEW.business_id;
    v_event_type := 'after_hours_alert';
    v_payload := jsonb_build_object(
      'type', 'after_hours_alert',
      'businessId', NEW.business_id,
      'data', jsonb_build_object(
        'alertType', NEW.alert_type,
        'description', NEW.description,
        'activityTime', NEW.activity_time
      )
    );

  ELSE
    RETURN NEW;
  END IF;

  -- Call edge function via pg_net (non-blocking)
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/send-event-notification',
    body := v_payload::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_anon_key
    )::jsonb
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't block the main operation if notification fails
  RAISE WARNING 'Event email notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Trigger: Send email on approval request events
DROP TRIGGER IF EXISTS trigger_email_on_approval ON approval_requests;
CREATE TRIGGER trigger_email_on_approval
  AFTER INSERT OR UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION send_event_email_notification();

-- Trigger: Send email on after-hours alerts
DROP TRIGGER IF EXISTS trigger_email_on_after_hours ON after_hours_alerts;
CREATE TRIGGER trigger_email_on_after_hours
  AFTER INSERT ON after_hours_alerts
  FOR EACH ROW
  EXECUTE FUNCTION send_event_email_notification();
