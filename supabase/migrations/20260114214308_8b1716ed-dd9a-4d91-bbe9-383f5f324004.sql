-- Create helper function to get staff_id for current user in a business
CREATE OR REPLACE FUNCTION public.get_staff_id_for_business(_business_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM staff
  WHERE user_id = auth.uid()
    AND business_id = _business_id
    AND is_active = true
  LIMIT 1
$$;

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Staff can create their own sales entries" ON daily_pump_sales;

-- Create new INSERT policy using the helper function
CREATE POLICY "Staff can create their own sales entries"
ON daily_pump_sales
FOR INSERT
TO public
WITH CHECK (
  is_business_owner(business_id) 
  OR (
    is_staff_of_business(business_id) 
    AND staff_id = get_staff_id_for_business(business_id)
  )
);