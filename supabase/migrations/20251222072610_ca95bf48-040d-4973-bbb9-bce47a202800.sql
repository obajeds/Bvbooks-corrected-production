-- Update addon_features to only allow professional and enterprise plans (no starter/free)
UPDATE addon_features 
SET applicable_plans = ARRAY['professional', 'enterprise']::subscription_plan[]
WHERE feature_key IN ('extra_branch', 'extra_staff');

-- Add price columns for different billing periods
ALTER TABLE addon_features 
ADD COLUMN IF NOT EXISTS price_quarterly numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_yearly numeric DEFAULT 0;

-- Set quarterly and yearly prices (with discounts: quarterly ~10% off, yearly ~20% off)
UPDATE addon_features SET 
  price_quarterly = CASE 
    WHEN feature_key = 'extra_branch' THEN 13500  -- 3 months at 4500/mo
    WHEN feature_key = 'extra_staff' THEN 5400    -- 3 months at 1800/mo
    WHEN feature_key = 'sms_email' THEN 8100      -- 3 months at 2700/mo
    WHEN feature_key = 'ai_insights' THEN 27000   -- 3 months at 9000/mo
    ELSE price_per_unit * 3 * 0.9
  END,
  price_yearly = CASE 
    WHEN feature_key = 'extra_branch' THEN 48000  -- 12 months at 4000/mo
    WHEN feature_key = 'extra_staff' THEN 19200   -- 12 months at 1600/mo
    WHEN feature_key = 'sms_email' THEN 28800     -- 12 months at 2400/mo
    WHEN feature_key = 'ai_insights' THEN 96000   -- 12 months at 8000/mo
    ELSE price_per_unit * 12 * 0.8
  END;

-- Add billing_period to business_addons to track what period was purchased
ALTER TABLE business_addons 
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';