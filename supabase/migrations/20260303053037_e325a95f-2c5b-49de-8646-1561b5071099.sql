
DROP POLICY IF EXISTS "Staff can create expenses" ON public.expenses;

CREATE POLICY "Staff can create expenses"
ON public.expenses FOR INSERT TO authenticated
WITH CHECK (
  is_business_owner(business_id)
  OR (
    business_id = get_staff_business_id()
    AND branch_id IS NOT NULL
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'expenses.create'::permission_key)
  )
);
