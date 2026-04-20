INSERT INTO public.addon_features (
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
  'Send email notifications for daily, weekly, and monthly reports',
  2000,
  5400,
  19200,
  'NGN',
  'monthly',
  true,
  '{professional, enterprise}'
);