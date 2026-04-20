-- Create a dedicated Email Notifications addon (separate from SMS)
INSERT INTO addon_features (
  feature_key,
  feature_name,
  description,
  price_per_unit,
  price_quarterly,
  price_yearly,
  currency,
  billing_period,
  is_active,
  applicable_plans
) VALUES (
  'email_notifications',
  'Email Notifications',
  'Receive sales reports, low stock alerts, and business notifications via email',
  2000,
  5400,
  19200,
  'NGN',
  'monthly',
  true,
  ARRAY['professional', 'enterprise']::subscription_plan[]
);

-- Rename the existing SMS & Email to just SMS Notifications for clarity
UPDATE addon_features 
SET feature_key = 'sms_notifications',
    feature_name = 'SMS Notifications',
    description = 'Send SMS notifications to customers for orders, reminders, and promotions'
WHERE id = '979f9475-d512-4b25-ac7e-0e41fe4fbdd2';