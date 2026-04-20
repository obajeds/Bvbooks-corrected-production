-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job to run scheduled notifications every hour
SELECT cron.schedule(
  'send-scheduled-notifications',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_functions_url') || '/send-scheduled-notifications',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := jsonb_build_object('type', 'all')
    );
  $$
);

-- Also add a way to manually trigger notifications for testing
CREATE OR REPLACE FUNCTION public.trigger_scheduled_notifications(notification_type text DEFAULT 'all')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function will be called from the edge function
  -- It's a placeholder for any additional DB-side logic needed
  RAISE NOTICE 'Scheduled notifications triggered for type: %', notification_type;
END;
$$;