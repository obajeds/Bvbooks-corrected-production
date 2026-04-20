
-- Remove dead cron jobs that call non-existent edge functions
SELECT cron.unschedule(2);  -- subscription-reminder (no function deployed)
SELECT cron.unschedule(3);  -- health-check (no function deployed)
SELECT cron.unschedule(5);  -- job-worker (no function, runs every minute)
SELECT cron.unschedule(6);  -- daily_summary enqueue (depends on dead job-worker)
