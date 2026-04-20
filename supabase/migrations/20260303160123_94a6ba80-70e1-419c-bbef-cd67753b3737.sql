-- Add DELETE policy for staff with expenses.approve or operations.expenses.approve permission
DROP POLICY IF EXISTS "Staff can delete expenses" ON expenses;
CREATE POLICY "Staff can delete expenses" ON expenses
FOR DELETE TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    business_id = get_user_business_id()
    AND branch_id IS NOT NULL
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND (
      has_branch_permission(auth.uid(), branch_id, 'expenses.approve'::permission_key)
      OR has_branch_permission(auth.uid(), branch_id, 'operations.expenses.approve'::permission_key)
    )
  )
);