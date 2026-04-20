-- Create a security definer function to check if a user is a staff member of a business
-- This bypasses RLS on the staff table when used in policies
CREATE OR REPLACE FUNCTION public.is_staff_of_business(check_business_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM staff 
    WHERE staff.business_id = check_business_id 
    AND staff.user_id = auth.uid() 
    AND staff.is_active = true
  );
$$;

-- Drop and recreate the policy to use the security definer function
DROP POLICY IF EXISTS "Staff can view their business" ON businesses;

CREATE POLICY "Staff can view their business"
ON businesses
FOR SELECT
USING (is_staff_of_business(id));