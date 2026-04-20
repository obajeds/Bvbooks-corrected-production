-- Add new accounting permission keys to the enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'accounting.overview.view';

-- Note: accounting.settlements.view, accounting.settlements.manage, and accounting.reconciliations.view already exist