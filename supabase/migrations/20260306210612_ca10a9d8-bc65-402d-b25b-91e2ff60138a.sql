
-- Reset the business-specific Cashier template (id: 1c6f71d8) to standard permissions
UPDATE role_templates 
SET permissions = '{dashboard.alerts.view,pos.access,pos.sale.create,pos.rewards.redeem,stock.levels.view,customers.overview.view,customers.activity.view,sales.performance.view}'::permission_key[],
    updated_at = now()
WHERE id = '1c6f71d8-2633-4228-b2cc-c418cd5fd5b9';
