SELECT cron.schedule(
  'check-error-alerts-every-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://qarkrmokbgyeeieefjbf.supabase.co/functions/v1/check-error-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcmtybW9rYmd5ZWVpZWVmamJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0ODUyMzAsImV4cCI6MjA3NDA2MTIzMH0.62Y5nRYb8FOo6Uy7iB7mwr9JXXf0jntfFdrezUNJUH0"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);