-- Set help_center to disabled to match other toggles being off
UPDATE platform_features 
SET is_enabled = false 
WHERE feature_key IN ('help_center', 'support_chat', 'team_management');