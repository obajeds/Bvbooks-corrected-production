-- Allow staff to read their own staff record
CREATE POLICY "Staff can view their own record"
ON public.staff
FOR SELECT
USING (user_id = auth.uid());

-- Allow staff to read the business they belong to
CREATE POLICY "Staff can view their business"
ON public.businesses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff
    WHERE staff.business_id = businesses.id
    AND staff.user_id = auth.uid()
    AND staff.is_active = true
  )
);