-- Fix infinite recursion in RLS policies for businesses and staff tables
-- The issue: policies query tables that have policies querying back

-- Step 1: Drop the problematic overlapping/recursive policies
DROP POLICY IF EXISTS "businesses_select_secure" ON public.businesses;
DROP POLICY IF EXISTS "staff_select_secure" ON public.staff;
DROP POLICY IF EXISTS "Staff can view their business" ON public.businesses;

-- Step 2: Recreate get_owned_business_id to be truly SECURITY DEFINER safe
-- It must NOT trigger RLS on the businesses table
CREATE OR REPLACE FUNCTION public.get_owned_business_id()
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

-- Step 3: Recreate get_staff_business_id to be truly safe
CREATE OR REPLACE FUNCTION public.get_staff_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id FROM public.staff 
  WHERE user_id = auth.uid() 
    AND is_active = true
  LIMIT 1
$$;

-- Step 4: Create a combined function to check business access without recursion
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- First check if user owns a business
  SELECT COALESCE(
    (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid() LIMIT 1),
    (SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true LIMIT 1)
  )
$$;

-- Step 5: Create simple, non-recursive SELECT policy for businesses
-- Owners see their business, staff see their assigned business, admins see all
CREATE POLICY "businesses_select_policy" ON public.businesses
FOR SELECT TO public
USING (
  owner_user_id = auth.uid()
  OR id = get_staff_business_id()
  OR is_super_admin_domain(auth.uid())
  OR is_admin(auth.uid())
);

-- Step 6: Create simple, non-recursive SELECT policy for staff
-- Users see their own record, owners see their business staff, admins see all
CREATE POLICY "staff_select_policy" ON public.staff
FOR SELECT TO public
USING (
  user_id = auth.uid()
  OR business_id = get_owned_business_id()
  OR is_super_admin_domain(auth.uid())
);