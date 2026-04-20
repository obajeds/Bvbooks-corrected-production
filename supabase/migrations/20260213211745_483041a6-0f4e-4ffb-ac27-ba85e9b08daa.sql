
-- Fix custom_roles: only owners can see/manage, staff cannot see any
DROP POLICY IF EXISTS "Staff can view custom_roles" ON public.custom_roles;
DROP POLICY IF EXISTS "Business owners can manage custom_roles" ON public.custom_roles;

CREATE POLICY "Business owners can manage custom_roles"
ON public.custom_roles FOR ALL
TO authenticated
USING (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));

-- Fix role_templates: tighten policies
DROP POLICY IF EXISTS "Role template access control" ON public.role_templates;
DROP POLICY IF EXISTS "Authenticated users can read system role templates" ON public.role_templates;
DROP POLICY IF EXISTS "Business users can read their role templates" ON public.role_templates;
DROP POLICY IF EXISTS "Super admins can manage all role templates" ON public.role_templates;

-- Staff only sees the role template assigned to them via branch assignments
CREATE POLICY "Users see relevant role templates"
ON public.role_templates FOR SELECT
TO authenticated
USING (
  is_super_admin_domain(auth.uid())
  OR (business_id IS NOT NULL AND business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
  OR (is_system = true AND business_id IS NULL AND EXISTS (SELECT 1 FROM businesses WHERE owner_user_id = auth.uid()))
  OR id IN (
    SELECT sba.role_template_id FROM staff_branch_assignments sba
    INNER JOIN staff s ON s.id = sba.staff_id
    WHERE s.user_id = auth.uid() AND s.is_active = true AND sba.is_active = true AND sba.role_template_id IS NOT NULL
  )
);

CREATE POLICY "Super admins can manage all role templates"
ON public.role_templates FOR ALL
TO authenticated
USING (is_super_admin_domain(auth.uid()))
WITH CHECK (is_super_admin_domain(auth.uid()));

CREATE POLICY "Business owners can manage their role templates"
ON public.role_templates FOR ALL
TO authenticated
USING (business_id IS NOT NULL AND business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()))
WITH CHECK (business_id IS NOT NULL AND business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid()));
