-- Add policy for staff to create expenses
CREATE POLICY "Staff can create expenses"
ON public.expenses
FOR INSERT
TO public
WITH CHECK (
  is_business_owner(business_id) 
  OR is_staff_of_business(business_id)
);

-- Add policy for staff to view expenses
CREATE POLICY "Staff can view expenses"
ON public.expenses
FOR SELECT
TO public
USING (
  is_business_owner(business_id) 
  OR is_staff_of_business(business_id)
);