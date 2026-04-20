-- =====================================================
-- FIX INFINITE RECURSION IN RLS POLICIES
-- =====================================================

-- Drop problematic SELECT policies on businesses that use recursive functions
DROP POLICY IF EXISTS "Staff can view their business" ON public.businesses;

-- Drop the is_business_owner function that causes recursion (used in staff policies)
DROP FUNCTION IF EXISTS public.is_business_owner(uuid) CASCADE;

-- Recreate is_business_owner to NOT query businesses table
-- Instead check if user owns business via owner_user_id directly
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Check staff table for owner role, don't query businesses directly
  SELECT EXISTS (
    SELECT 1
    FROM public.staff s
    WHERE s.business_id = _business_id
      AND s.user_id = auth.uid()
      AND s.role = 'owner'
      AND s.is_active = true
  )
  OR
  -- Fallback: check if auth.uid() matches owner_user_id in a way that doesn't recurse
  -- We do this via RPC call context, not within RLS
  auth.uid() = (
    SELECT owner_user_id 
    FROM public.businesses b 
    WHERE b.id = _business_id
  )
$$;

-- Actually the above still has recursion potential when called from businesses RLS
-- Better approach: Create separate functions for different contexts

DROP FUNCTION IF EXISTS public.is_business_owner(uuid) CASCADE;

-- For staff table policies - check businesses.owner_user_id
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  -- Direct check without triggering businesses RLS by using SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.businesses 
    WHERE id = _business_id AND owner_user_id = auth.uid()
  ) INTO is_owner;
  RETURN is_owner;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_business_owner(uuid) TO anon;