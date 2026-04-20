-- Rename enum value from 'starter' to 'free'
ALTER TYPE subscription_plan RENAME VALUE 'starter' TO 'free';

-- Update any existing data (safety net - should already be 'free' after enum rename)
UPDATE businesses SET subscription_plan = 'free' WHERE subscription_plan::text = 'starter';
UPDATE subscriptions SET plan = 'free' WHERE plan::text = 'starter';