-- Fix INSERT policy to use has_branch_permission for custom role support
DROP POLICY IF EXISTS "Staff can create expenses" ON expenses;

CREATE POLICY "Staff can create expenses" ON expenses
FOR INSERT TO authenticated
WITH CHECK (
  is_business_owner(business_id)
  OR (
    business_id = get_staff_business_id()
    AND branch_id IS NOT NULL
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_branch_permission(auth.uid(), branch_id, 'expenses.create'::permission_key)
  )
);

-- Fix SELECT policy to use has_branch_permission for custom role support
DROP POLICY IF EXISTS "Staff can view expenses in assigned branches" ON expenses;

CREATE POLICY "Staff can view expenses in assigned branches" ON expenses
FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_branch_permission(auth.uid(), branch_id, 'expenses.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);