-- Insert monthly_sales_report into notification_defaults
INSERT INTO public.notification_defaults (
  notification_type,
  default_in_app_enabled,
  default_email_enabled,
  default_push_enabled,
  default_settings,
  description,
  is_available,
  is_critical,
  is_enforced,
  applicable_roles
) VALUES (
  'monthly_sales_report',
  true,
  true,
  false,
  '{}',
  'Comprehensive monthly sales report sent on the 1st of each month',
  true,
  false,
  false,
  NULL
);