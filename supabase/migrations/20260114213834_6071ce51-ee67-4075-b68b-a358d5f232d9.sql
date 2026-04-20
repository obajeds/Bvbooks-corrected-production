-- Add gas module permissions to the permission_key enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'gas.sales.entry';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'gas.sales.view_own';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'gas.summary.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'gas.pumps.manage';

-- Add new accounting permissions to the permission_key enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'accounting.settlements.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'accounting.settlements.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'accounting.reconciliations.view';