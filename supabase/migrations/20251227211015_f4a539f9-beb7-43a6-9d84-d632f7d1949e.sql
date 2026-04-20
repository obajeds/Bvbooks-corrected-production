-- Create the addon record for the successful payment that failed to record
INSERT INTO business_addons (
  business_id,
  addon_feature_id,
  quantity,
  status,
  start_date,
  end_date,
  amount_paid,
  billing_period,
  payment_reference
) VALUES (
  '5a10600e-38e4-4543-b984-68d0590f4172',
  'e5a20fd2-ee24-4dbd-9c84-b75102473531',
  1,
  'active',
  '2025-12-27T21:06:45.000Z',
  '2026-01-26T21:06:45.000Z',
  4000,
  'monthly',
  '24p0fnm92x'
);