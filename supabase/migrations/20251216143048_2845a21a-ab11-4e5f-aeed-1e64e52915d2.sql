-- Drop the existing check constraint
ALTER TABLE public.subscriptions DROP CONSTRAINT subscriptions_status_check;

-- Add the new check constraint with 'trial' included
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_status_check 
CHECK (status = ANY (ARRAY['active'::text, 'cancelled'::text, 'expired'::text, 'paused'::text, 'trial'::text]));