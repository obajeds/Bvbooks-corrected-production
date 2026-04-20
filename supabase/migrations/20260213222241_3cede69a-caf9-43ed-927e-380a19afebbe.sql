
-- Fix Ernest's branch assignment to link to the Manager role template
UPDATE staff_branch_assignments
SET role_template_id = 'c9c7ab98-4d50-4c1e-9f6e-fe8d4bc5988f', updated_at = now()
WHERE staff_id = '7784b224-9fd0-4ecf-a5bc-553fefc7a5c8'
  AND is_active = true;

-- Also ensure staff_permissions match the current Manager template
-- First delete existing
DELETE FROM staff_permissions WHERE staff_id = '7784b224-9fd0-4ecf-a5bc-553fefc7a5c8';

-- Re-insert from the business-specific Manager template
INSERT INTO staff_permissions (staff_id, permission)
SELECT '7784b224-9fd0-4ecf-a5bc-553fefc7a5c8', unnest(permissions)
FROM role_templates
WHERE id = 'c9c7ab98-4d50-4c1e-9f6e-fe8d4bc5988f';
