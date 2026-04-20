-- Step 2: Update existing data to use new enum values
UPDATE businesses SET current_plan = 'professional' WHERE current_plan = 'basic';
UPDATE businesses SET current_plan = 'enterprise' WHERE current_plan = 'premium';

UPDATE plan_features SET plan = 'professional' WHERE plan = 'basic';
UPDATE plan_features SET plan = 'enterprise' WHERE plan = 'premium';

UPDATE plan_limits SET plan = 'professional' WHERE plan = 'basic';
UPDATE plan_limits SET plan = 'enterprise' WHERE plan = 'premium';