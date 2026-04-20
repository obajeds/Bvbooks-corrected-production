-- Add missing module-level platform feature keys for sidebar gating
-- These are high-level toggles that Super Admin can use to disable entire modules

INSERT INTO platform_features (feature_key, feature_name, category, description, is_enabled, applicable_plans)
VALUES 
  ('crm_module', 'Customer Management Module', 'sales', 'Complete CRM and customer management features', true, ARRAY['starter', 'professional', 'enterprise']::subscription_plan[]),
  ('gas_module', 'Gas Station Module', 'operations', 'Gas station pump management and sales tracking', true, ARRAY['professional', 'enterprise']::subscription_plan[]),
  ('approvals_module', 'Approvals & Workflows', 'operations', 'Approval workflows for discounts, refunds, and stock', true, ARRAY['professional', 'enterprise']::subscription_plan[])
ON CONFLICT (feature_key) DO UPDATE 
SET 
  feature_name = EXCLUDED.feature_name,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = now();