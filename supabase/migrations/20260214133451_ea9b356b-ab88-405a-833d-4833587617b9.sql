-- Remove the duplicate trigger to prevent double-counting
DROP TRIGGER IF EXISTS trigger_update_customer_on_sale ON public.sales;