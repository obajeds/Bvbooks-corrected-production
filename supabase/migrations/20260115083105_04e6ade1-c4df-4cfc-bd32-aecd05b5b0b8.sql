-- =====================================================
-- COMPLETE FIX FOR ALL INFINITE RECURSION ISSUES
-- =====================================================

-- Step 1: Drop problematic policies on brms that query businesses
DROP POLICY IF EXISTS "Business owners can view their assigned BRM" ON public.brms;

-- Step 2: Drop the policy on businesses that queries brms (causes chain reaction)
DROP POLICY IF EXISTS "Assigned BRMs can view their businesses" ON public.businesses;

-- Step 3: Drop the get_user_business_id function that queries businesses
-- (used in staff policies, causes recursion when staff is joined)
DROP FUNCTION IF EXISTS public.get_user_business_id() CASCADE;

-- Step 4: Create a SECURITY DEFINER function to check if user owns a business
-- This bypasses RLS completely and prevents recursion
CREATE OR REPLACE FUNCTION public.check_owns_business(_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = _business_id AND owner_user_id = auth.uid()
  );
END;
$$;

-- Step 5: Create a SECURITY DEFINER function to get user's business ID
CREATE OR REPLACE FUNCTION public.get_owned_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_id uuid;
BEGIN
  SELECT id INTO biz_id FROM public.businesses 
  WHERE owner_user_id = auth.uid() 
  LIMIT 1;
  RETURN biz_id;
END;
$$;

-- Step 6: Recreate staff policy using the secure function
DROP POLICY IF EXISTS "Business owners can manage staff" ON public.staff;
CREATE POLICY "Business owners can manage staff" 
ON public.staff
FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

-- Step 7: Recreate BRM viewing policy on brms table using secure function
CREATE POLICY "Business owners can view their assigned BRM" 
ON public.brms
FOR SELECT
USING (
  id IN (
    SELECT brm_id FROM public.businesses WHERE owner_user_id = auth.uid()
  )
);
-- Note: This still might recurse. Let's use SECURITY DEFINER instead

-- Actually drop that and use a function
DROP POLICY IF EXISTS "Business owners can view their assigned BRM" ON public.brms;

CREATE OR REPLACE FUNCTION public.get_owner_brm_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  the_brm_id uuid;
BEGIN
  SELECT brm_id INTO the_brm_id FROM public.businesses 
  WHERE owner_user_id = auth.uid() 
  LIMIT 1;
  RETURN the_brm_id;
END;
$$;

CREATE POLICY "Business owners can view their assigned BRM" 
ON public.brms
FOR SELECT
USING (id = public.get_owner_brm_id());

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.check_owns_business(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owned_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_brm_id() TO authenticated;