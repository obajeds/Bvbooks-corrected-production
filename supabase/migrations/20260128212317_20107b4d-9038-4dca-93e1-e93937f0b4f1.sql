-- Disable remaining visible toggles for testing enforcement
UPDATE platform_features 
SET is_enabled = false 
WHERE feature_key IN ('approvals_module', 'advanced_reports', 'daily_snapshot', 'advanced_roles');