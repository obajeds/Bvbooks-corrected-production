-- Add missing platform feature toggles for Settings section
INSERT INTO platform_features (feature_key, feature_name, is_enabled, category, description)
VALUES 
  ('business_profile', 'Business Profile', true, 'settings', 'Access to business settings and profile configuration'),
  ('help_center', 'Help Center', true, 'support', 'Access to help articles and documentation'),
  ('support_chat', 'Support Chat', true, 'support', 'Access to support chat functionality'),
  ('team_management', 'Team Management', true, 'people_access', 'Basic team member management'),
  ('product_catalog', 'Product Catalog', true, 'inventory', 'Access to product catalog'),
  ('pos_transactions', 'POS Transactions', true, 'sales', 'Point of sale functionality')
ON CONFLICT (feature_key) DO NOTHING;