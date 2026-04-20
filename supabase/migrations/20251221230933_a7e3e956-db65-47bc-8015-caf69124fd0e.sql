-- Update addon_features applicable_plans column to use text array instead of enum
-- First check if the data was inserted (the plan_features should have been inserted before the error)

-- Add extra add-ons with correct applicable_plans for the old enum
UPDATE public.addon_features 
SET applicable_plans = ARRAY['starter', 'professional', 'enterprise']::subscription_plan[]
WHERE feature_key IN ('extra_branch', 'ai_insights', 'sms_email', 'extra_staff');

-- Insert any missing add-ons
INSERT INTO public.addon_features (feature_key, feature_name, description, price_per_unit, currency, billing_period, applicable_plans, is_active)
VALUES 
('extra_branch', 'Extra Branch', 'Add an additional branch beyond your plan limit', 5000, 'NGN', 'monthly', ARRAY['starter', 'professional', 'enterprise']::subscription_plan[], true),
('ai_insights', 'AI Sales & Loss Insights', 'AI-powered analysis of sales patterns and loss prevention', 10000, 'NGN', 'monthly', ARRAY['professional', 'enterprise']::subscription_plan[], true),
('sms_email', 'SMS & Email Notifications', 'Send SMS and email notifications to customers', 3000, 'NGN', 'monthly', ARRAY['professional', 'enterprise']::subscription_plan[], true),
('extra_staff', 'Extra Staff Accounts', 'Add additional staff accounts beyond plan limit', 2000, 'NGN', 'monthly', ARRAY['starter', 'professional', 'enterprise']::subscription_plan[], true)
ON CONFLICT (feature_key) DO UPDATE SET 
  description = EXCLUDED.description,
  price_per_unit = EXCLUDED.price_per_unit,
  is_active = true;