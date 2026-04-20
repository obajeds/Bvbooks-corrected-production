
-- Helper: get staff role without recursion
CREATE OR REPLACE FUNCTION public.get_staff_role_for_rls(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM staff WHERE user_id = _user_id AND is_active = true LIMIT 1;
$$;

-- Drop old overlapping policies
DROP POLICY IF EXISTS "Staff can view sales from assigned branches" ON sales;
DROP POLICY IF EXISTS "Sales access control" ON sales;
DROP POLICY IF EXISTS "sales_select_secure" ON sales;

-- New tiered policy combining all non-owner/non-admin access
CREATE POLICY "Staff tiered sales visibility" ON sales
FOR SELECT TO authenticated
USING (
  -- Business owner bypass
  (EXISTS (SELECT 1 FROM businesses WHERE id = sales.business_id AND owner_user_id = auth.uid()))
  OR
  -- Super admin bypass
  is_super_admin_domain(auth.uid())
  OR
  (
    has_permission(auth.uid(), 'sales.view'::permission_key)
    AND (
      (branch_id IS NULL AND can_access_business(business_id))
      OR can_access_branch_for_rls(auth.uid(), branch_id)
    )
    AND (
      -- Managers & Supervisors see all branch sales
      get_staff_role_for_rls(auth.uid()) IN ('manager', 'supervisor', 'Manager', 'Supervisor')
      OR
      -- Everyone else sees only their own
      created_by = auth.uid()
    )
  )
);
