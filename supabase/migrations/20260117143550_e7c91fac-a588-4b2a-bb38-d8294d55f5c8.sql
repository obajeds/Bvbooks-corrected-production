-- First, fix existing data to comply with safety limits
UPDATE public.rewards_settings 
SET points_per_naira = LEAST(points_per_naira, 10),
    naira_per_point = GREATEST(LEAST(naira_per_point, 1), 0.001)
WHERE points_per_naira > 10 OR naira_per_point > 1;

-- Add new columns for comprehensive rewards system with safety limits
ALTER TABLE public.rewards_settings
ADD COLUMN IF NOT EXISTS min_points_to_redeem integer NOT NULL DEFAULT 1000,
ADD COLUMN IF NOT EXISTS max_discount_percent numeric NOT NULL DEFAULT 10,
ADD COLUMN IF NOT EXISTS points_expiry_months integer DEFAULT NULL;

-- Add check constraints for safety limits
ALTER TABLE public.rewards_settings
ADD CONSTRAINT check_points_per_naira CHECK (points_per_naira >= 0 AND points_per_naira <= 10),
ADD CONSTRAINT check_naira_per_point CHECK (naira_per_point >= 0 AND naira_per_point <= 1),
ADD CONSTRAINT check_min_points_to_redeem CHECK (min_points_to_redeem >= 100),
ADD CONSTRAINT check_max_discount_percent CHECK (max_discount_percent >= 1 AND max_discount_percent <= 50);

-- Add comment for documentation
COMMENT ON TABLE public.rewards_settings IS 'Business loyalty/rewards program settings with safety limits';