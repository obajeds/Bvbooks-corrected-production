-- Allow staff to view branches of their business
CREATE POLICY "Staff can view their business branches"
ON public.branches
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = branches.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff to view departments of their business
CREATE POLICY "Staff can view their business departments"
ON public.departments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = departments.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);