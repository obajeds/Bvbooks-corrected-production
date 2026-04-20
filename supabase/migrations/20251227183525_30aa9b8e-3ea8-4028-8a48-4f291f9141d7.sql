-- Reset all business subscriptions to free plan
UPDATE businesses 
SET current_plan = 'free', 
    trial_started_at = NULL, 
    trial_ends_at = NULL,
    plan_started_at = now(),
    plan_expires_at = NULL,
    subscription_plan = 'starter',
    subscription_expiry = NULL,
    account_status = 'active';