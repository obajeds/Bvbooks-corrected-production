-- Remove accounting permissions from Manager role template (c9c7ab98-4d50-4c1e-9f6e-fe8d4bc5988f)
-- Financial Overview and Reconciliations are now owner-only
UPDATE role_templates
SET permissions = array_remove(
  array_remove(
    array_remove(permissions, 'accounting.overview.view'::permission_key),
    'accounting.reconciliations.view'::permission_key
  ),
  'accounting.reconciliations.manage'::permission_key
)
WHERE id = 'c9c7ab98-4d50-4c1e-9f6e-fe8d4bc5988f';