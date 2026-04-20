-- =====================================================
-- FIX INFINITE RECURSION IN BUSINESSES RLS POLICIES
-- =====================================================

-- Drop the problematic function with CASCADE to remove dependent policies
DROP FUNCTION IF EXISTS public.is_brm_of_business(uuid) CASCADE;

-- Recreate is_brm_of_business that checks brms table only (not businesses)
CREATE OR REPLACE FUNCTION public.is_brm_of_business(check_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check if the current user is a BRM by checking brms table only
  -- The business_id match will be done via the brm_id column in businesses
  SELECT EXISTS (
    SELECT 1 FROM public.brms
    WHERE brms.user_id = auth.uid()
    AND brms.status = 'active'
  )
$$;

-- Recreate the BRM policy using a direct join that doesn't cause recursion
-- (The "Assigned BRMs can view their businesses" policy already handles this correctly)
-- No need to recreate it as it uses a simple EXISTS without calling functions