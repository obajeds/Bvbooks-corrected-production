
-- Drop the new sale notification trigger and function
DROP TRIGGER IF EXISTS trigger_notify_on_new_sale ON sales;
DROP FUNCTION IF EXISTS public.notify_on_new_sale();
