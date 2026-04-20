-- Update the business-specific Manager role template to include accounting permissions
-- matching the system-wide Manager template
UPDATE role_templates
SET permissions = permissions || ARRAY[
  'accounting.view',
  'accounting.overview.view',
  'accounting.settlements.view',
  'accounting.settlements.manage',
  'accounting.reconciliations.view',
  'accounting.reconciliations.manage',
  'reports.view.financial',
  'reports.export',
  'dashboard.branch_performance.view',
  'pos.discount.override',
  'sales.edit',
  'sales.delete',
  'inventory.item.delete',
  'inventory.adjust.approve',
  'expenses.approve',
  'approval.discount.stop',
  'settings.rewards.manage',
  'staff.manage',
  'staff.permissions.manage',
  'settings.view',
  'settings.manage',
  'audit.view'
]::permission_key[]
WHERE id = 'c9c7ab98-4d50-4c1e-9f6e-fe8d4bc5988f'
AND NOT ('accounting.settlements.view' = ANY(permissions));