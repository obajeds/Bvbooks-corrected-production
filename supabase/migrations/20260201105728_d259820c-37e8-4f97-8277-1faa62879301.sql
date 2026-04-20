-- Reactivate Enex Gas enterprise subscription
UPDATE subscriptions 
SET status = 'active', updated_at = NOW()
WHERE id = '62548721-3d2f-4bfa-bb2b-0c094d91256a';

-- Ensure business record is also synced
UPDATE businesses 
SET current_plan = 'enterprise', 
    subscription_plan = 'enterprise',
    account_status = 'active',
    updated_at = NOW()
WHERE id = '1db06ad7-32d2-4a3e-969d-6617664bf3d3';