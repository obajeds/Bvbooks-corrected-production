-- Fix customers RLS policies: add owner bypass, use role-template-aware checks, add DELETE policy

-- Drop the broken INSERT policy
DROP POLICY IF EXISTS "Staff with crm.manage can insert customers" ON customers;

-- Drop the broken UPDATE policy
DROP POLICY IF EXISTS "Staff with crm.manage can update customers" ON customers;

-- Create fixed INSERT policy with owner bypass and role-template-aware check
CREATE POLICY "Staff with crm.manage can insert customers" ON customers
FOR INSERT TO authenticated
WITH CHECK (
  -- Owner bypass
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = customers.business_id
      AND b.owner_user_id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.business_id = customers.business_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
    AND (
      -- Check via has_permission (direct staff_permissions)
      has_permission(auth.uid(), 'crm.manage'::permission_key)
      -- Check via role templates (branch assignments)
      OR EXISTS (
        SELECT 1
        FROM staff s
        INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
        INNER JOIN role_templates rt ON rt.id = sba.role_template_id
        WHERE s.user_id = auth.uid()
          AND s.is_active = true
          AND sba.is_active = true
          AND (sba.expires_at IS NULL OR sba.expires_at > now())
          AND rt.permissions && ARRAY['crm.manage']::permission_key[]
      )
    )
  )
);

-- Create fixed UPDATE policy with owner bypass and role-template-aware check
CREATE POLICY "Staff with crm.manage can update customers" ON customers
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = customers.business_id
      AND b.owner_user_id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.business_id = customers.business_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
    AND (
      has_permission(auth.uid(), 'crm.manage'::permission_key)
      OR EXISTS (
        SELECT 1
        FROM staff s
        INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
        INNER JOIN role_templates rt ON rt.id = sba.role_template_id
        WHERE s.user_id = auth.uid()
          AND s.is_active = true
          AND sba.is_active = true
          AND (sba.expires_at IS NULL OR sba.expires_at > now())
          AND rt.permissions && ARRAY['crm.manage']::permission_key[]
      )
    )
  )
);

-- Add DELETE policy for customers (owner or staff with crm.manage)
CREATE POLICY "Staff with crm.manage can delete customers" ON customers
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = customers.business_id
      AND b.owner_user_id = auth.uid()
  )
  OR (
    EXISTS (
      SELECT 1 FROM staff s
      WHERE s.business_id = customers.business_id
        AND s.user_id = auth.uid()
        AND s.is_active = true
    )
    AND (
      has_permission(auth.uid(), 'crm.manage'::permission_key)
      OR EXISTS (
        SELECT 1
        FROM staff s
        INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
        INNER JOIN role_templates rt ON rt.id = sba.role_template_id
        WHERE s.user_id = auth.uid()
          AND s.is_active = true
          AND sba.is_active = true
          AND (sba.expires_at IS NULL OR sba.expires_at > now())
          AND rt.permissions && ARRAY['crm.manage']::permission_key[]
      )
    )
  )
);