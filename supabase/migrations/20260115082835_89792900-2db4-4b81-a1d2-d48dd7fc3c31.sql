-- =====================================================
-- COMPLETELY FIX INFINITE RECURSION - DROP ALL PROBLEMATIC POLICIES
-- =====================================================

-- Step 1: Drop the problematic policy on businesses that queries staff
DROP POLICY IF EXISTS "Business staff can view their business" ON public.businesses;

-- Step 2: Drop the problematic policy on staff that queries businesses
DROP POLICY IF EXISTS "Business owners can view their staff" ON public.staff;

-- Step 3: Drop the ALL policy that uses is_business_owner function
DROP POLICY IF EXISTS "Business owners can manage staff" ON public.staff;

-- Step 4: Drop any functions that might cause recursion
DROP FUNCTION IF EXISTS public.is_business_owner(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_staff_of_business(uuid) CASCADE;

-- Step 5: Create clean, non-recursive function for checking business ownership
-- This uses SECURITY DEFINER to bypass RLS and prevent recursion
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.businesses 
  WHERE owner_user_id = auth.uid() 
  LIMIT 1
$$;

-- Step 6: Recreate staff policies that don't query businesses table
-- Owners can manage staff - check ownership via the secure function
CREATE POLICY "Business owners can manage staff" 
ON public.staff
FOR ALL
USING (business_id = public.get_user_business_id())
WITH CHECK (business_id = public.get_user_business_id());

-- Step 7: The businesses table already has "Business owners can view their business" 
-- which uses simple (owner_user_id = auth.uid()) - this is fine and doesn't recurse

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO anon;