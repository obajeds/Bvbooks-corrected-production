-- 1) Replace has_branch_permission to bridge legacy↔canonical expense keys
CREATE OR REPLACE FUNCTION public.has_branch_permission(_user_id uuid, _branch_id uuid, _permission permission_key)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _keys permission_key[];
BEGIN
  -- Owner bypass: owners have all permissions on all branches
  IF EXISTS (
    SELECT 1 FROM businesses b
    INNER JOIN branches br ON br.business_id = b.id
    WHERE b.owner_user_id = _user_id
      AND br.id = _branch_id
  ) THEN
    RETURN true;
  END IF;

  -- Build alias-aware key set (legacy ↔ canonical mapping for expenses)
  _keys := ARRAY[_permission];
  
  IF _permission = 'expenses.create' THEN
    _keys := _keys || 'operations.expenses.record'::permission_key;
  ELSIF _permission = 'operations.expenses.record' THEN
    _keys := _keys || 'expenses.create'::permission_key;
  ELSIF _permission = 'expenses.view' THEN
    _keys := _keys || 'operations.expenses.view'::permission_key;
  ELSIF _permission = 'operations.expenses.view' THEN
    _keys := _keys || 'expenses.view'::permission_key;
  ELSIF _permission = 'expenses.approve' THEN
    _keys := _keys || 'operations.expenses.approve'::permission_key;
  ELSIF _permission = 'operations.expenses.approve' THEN
    _keys := _keys || 'expenses.approve'::permission_key;
  END IF;

  -- Check via role template in branch assignment
  IF EXISTS (
    SELECT 1
    FROM staff s
    INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
    INNER JOIN role_templates rt ON rt.id = sba.role_template_id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sba.branch_id = _branch_id
      AND sba.is_active = true
      AND (sba.expires_at IS NULL OR sba.expires_at > now())
      AND rt.permissions && _keys
  ) THEN
    RETURN true;
  END IF;

  -- Check individual staff_permissions (backward compat)
  IF EXISTS (
    SELECT 1
    FROM staff s
    INNER JOIN staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sp.permission = ANY(_keys)
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- 2) Harden expenses INSERT policy: accept either legacy or canonical key
DROP POLICY IF EXISTS "Staff can create expenses" ON expenses;
CREATE POLICY "Staff can create expenses" ON expenses
FOR INSERT TO authenticated
WITH CHECK (
  is_business_owner(business_id)
  OR (
    business_id = get_user_business_id()
    AND branch_id IS NOT NULL
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND (
      has_branch_permission(auth.uid(), branch_id, 'expenses.create'::permission_key)
      OR has_branch_permission(auth.uid(), branch_id, 'operations.expenses.record'::permission_key)
    )
  )
);

-- 3) Harden expenses SELECT policy: accept either legacy or canonical key
DROP POLICY IF EXISTS "Staff can view expenses" ON expenses;
CREATE POLICY "Staff can view expenses" ON expenses
FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    business_id = get_user_business_id()
    AND (
      branch_id IS NULL
      OR can_access_branch_for_rls(auth.uid(), branch_id)
    )
    AND (
      has_branch_permission(auth.uid(), COALESCE(branch_id, (SELECT id FROM branches WHERE business_id = get_user_business_id() LIMIT 1)), 'expenses.view'::permission_key)
      OR has_branch_permission(auth.uid(), COALESCE(branch_id, (SELECT id FROM branches WHERE business_id = get_user_business_id() LIMIT 1)), 'operations.expenses.view'::permission_key)
    )
  )
);