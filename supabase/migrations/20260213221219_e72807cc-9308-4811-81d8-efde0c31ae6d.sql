
-- =====================================================
-- RESET ALL STAFF TO DEFAULT: Zero permissions, role='pending'
-- Forces business owner to manually re-assign roles
-- =====================================================

-- 1. Delete ALL staff_permissions for non-owner staff
DELETE FROM staff_permissions
WHERE staff_id IN (
  SELECT s.id FROM staff s
  LEFT JOIN businesses b ON b.id = s.business_id
  WHERE b.owner_user_id IS NULL OR s.user_id != b.owner_user_id
);

-- 2. Set role to 'pending' for all non-owner staff (column is NOT NULL)
UPDATE staff
SET role = 'pending', updated_at = now()
WHERE id IN (
  SELECT s.id FROM staff s
  LEFT JOIN businesses b ON b.id = s.business_id
  WHERE b.owner_user_id IS NULL OR s.user_id != b.owner_user_id
);

-- 3. Remove role_template_id from branch assignments (force re-assignment)
UPDATE staff_branch_assignments
SET role_template_id = NULL, updated_at = now()
WHERE staff_id IN (
  SELECT s.id FROM staff s
  LEFT JOIN businesses b ON b.id = s.business_id
  WHERE b.owner_user_id IS NULL OR s.user_id != b.owner_user_id
);

-- 4. Log this security action
INSERT INTO admin_audit_logs (
  admin_user_id, admin_name, role, action, entity_type, entity_id, entity_name, ip_address, after_value
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System (Security Reset)',
  'super_admin',
  'mass_permission_reset',
  'staff',
  'all',
  'All Staff Permissions Reset',
  '0.0.0.0',
  '{"reason": "Enterprise RBAC enforcement - all staff reset to zero permissions pending manual re-assignment by business owner"}'
);
