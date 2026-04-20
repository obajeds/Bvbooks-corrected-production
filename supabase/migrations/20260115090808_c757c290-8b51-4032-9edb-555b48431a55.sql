-- =====================================================
-- COMPREHENSIVE RLS FIX + STAFF BUSINESS ACCESS
-- This migration restores staff access to businesses
-- while preventing infinite recursion
-- =====================================================

-- Step 1: Create a SECURITY DEFINER function for staff to get their business ID
-- This bypasses RLS on staff table to prevent recursion
CREATE OR REPLACE FUNCTION public.get_staff_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_id uuid;
BEGIN
  -- Get business_id from staff table where user is active staff
  SELECT business_id INTO biz_id 
  FROM public.staff 
  WHERE user_id = auth.uid() 
    AND is_active = true
  LIMIT 1;
  
  RETURN biz_id;
END;
$$;

-- Step 2: Create a unified function that checks both owner and staff access
CREATE OR REPLACE FUNCTION public.get_user_accessible_business_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  biz_id uuid;
BEGIN
  -- First check if user is an owner
  SELECT id INTO biz_id 
  FROM public.businesses 
  WHERE owner_user_id = auth.uid() 
  LIMIT 1;
  
  -- If not an owner, check if they're staff
  IF biz_id IS NULL THEN
    SELECT business_id INTO biz_id 
    FROM public.staff 
    WHERE user_id = auth.uid() 
      AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN biz_id;
END;
$$;

-- Step 3: Add policy for staff to view their business
-- Uses SECURITY DEFINER function to prevent recursion
CREATE POLICY "Staff can view their business" 
ON public.businesses
FOR SELECT
USING (id = public.get_staff_business_id());

-- Step 4: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_staff_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_business_id() TO authenticated;

-- Step 5: Add comment documenting the RLS pattern to prevent future issues
COMMENT ON FUNCTION public.get_staff_business_id() IS 
'SECURITY DEFINER function to get staff business ID without triggering RLS recursion. 
NEVER create RLS policies that query other tables with RLS directly - always use SECURITY DEFINER functions.';

COMMENT ON FUNCTION public.get_user_accessible_business_id() IS 
'SECURITY DEFINER function to get business ID for any authenticated user (owner or staff) without RLS recursion.';