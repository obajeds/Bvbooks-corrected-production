
-- Drop auto-assignment triggers on businesses table
DROP TRIGGER IF EXISTS trigger_auto_assign_brm ON public.businesses;
DROP TRIGGER IF EXISTS auto_assign_brm_before_trigger ON public.businesses;
DROP TRIGGER IF EXISTS auto_assign_brm_after_trigger ON public.businesses;

-- Drop auto-assignment functions
DROP FUNCTION IF EXISTS public.auto_assign_brm();
DROP FUNCTION IF EXISTS public.auto_assign_brm_before();
DROP FUNCTION IF EXISTS public.auto_assign_brm_after();
DROP FUNCTION IF EXISTS public.get_next_brm_for_assignment();
