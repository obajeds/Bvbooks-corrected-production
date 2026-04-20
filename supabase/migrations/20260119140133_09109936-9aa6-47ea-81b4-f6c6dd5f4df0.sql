-- Add new accounting permission key for reconciliation management
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'accounting.reconciliations.manage';