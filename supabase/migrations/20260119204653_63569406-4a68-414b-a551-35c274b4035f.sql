-- Update the max_discount_percent for the business using conservative rewards to 5%
UPDATE rewards_settings 
SET max_discount_percent = 5, updated_at = now()
WHERE business_id = '5a10600e-38e4-4543-b984-68d0590f4172' 
AND points_per_naira = 0.5;