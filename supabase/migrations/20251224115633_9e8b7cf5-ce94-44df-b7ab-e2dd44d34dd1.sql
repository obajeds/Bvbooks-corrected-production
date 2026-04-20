-- Update trial to free in businesses table
UPDATE businesses SET current_plan = 'free' WHERE current_plan = 'trial';

-- Update Connect's current_plan to professional
UPDATE businesses SET current_plan = 'professional' WHERE trading_name = 'Connect';