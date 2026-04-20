-- Drop the restrictive staff insert policy
DROP POLICY IF EXISTS "Staff with pos.sale.create can insert sales" ON public.sales;

-- Create a simpler policy that allows active staff to insert sales in their business
CREATE POLICY "Active staff can create sales in their business"
ON public.sales
FOR INSERT
WITH CHECK (
  is_business_owner(business_id)
  OR 
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.business_id = sales.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);