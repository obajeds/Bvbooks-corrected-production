-- Reset all subscriptions to starter/cancelled
UPDATE subscriptions 
SET plan = 'starter',
    status = 'cancelled',
    change_reason = 'Admin reset to free plan',
    updated_at = now();