-- Add INSERT policy for business owners to create payroll records
CREATE POLICY "Business owners can insert payroll"
ON public.payroll
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = payroll.business_id
    AND b.owner_user_id = auth.uid()
  )
);

-- Add UPDATE policy for business owners to update payroll records
CREATE POLICY "Business owners can update payroll"
ON public.payroll
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = payroll.business_id
    AND b.owner_user_id = auth.uid()
  )
);

-- Add DELETE policy for business owners to delete payroll records
CREATE POLICY "Business owners can delete payroll"
ON public.payroll
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = payroll.business_id
    AND b.owner_user_id = auth.uid()
  )
);