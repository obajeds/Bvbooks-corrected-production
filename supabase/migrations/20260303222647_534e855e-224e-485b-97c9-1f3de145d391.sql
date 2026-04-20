
-- Step 1: Update system role templates with correct canonical permission keys

-- Cashier
UPDATE role_templates SET
  permissions = '{dashboard.alerts.view,pos.access,pos.sale.create,pos.rewards.redeem,stock.levels.view,customers.overview.view,customers.activity.view,sales.performance.view}'::permission_key[],
  description = 'Transaction processing only. Can create sales and print receipts. No reports, no inventory editing, no settings access.',
  updated_at = now()
WHERE id = '0f242449-0a74-4f45-bffd-31e4c1ab5345' AND is_system = true;

-- Manager
UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.sale.refund,pos.discount.apply,pos.discount.override,pos.rewards.redeem,sales.performance.view,sales.reports.view,stock.catalog.view,stock.catalog.manage,stock.categories.view,stock.categories.manage,stock.levels.view,stock.adjust,stock.adjustments.history,stock.suppliers.manage,stock.orders.view,stock.orders.create,stock.orders.approve,customers.overview.view,customers.activity.view,customers.groups.manage,customers.rewards.view,customers.rewards.manage,operations.expenses.view,operations.expenses.record,operations.expenses.approve,insights.reports.view,insights.financial.view,people.attendance.view,people.attendance.manage,settings.activity.view,dashboard.alerts.view,dashboard.top_selling.view,dashboard.profit.view,dashboard.branch_performance.view}'::permission_key[],
  description = 'Can view performance reports and approve discounts/refunds within limits. Cannot manage staff, assign roles, or change business settings.',
  updated_at = now()
WHERE id = '235154b2-5834-43e6-a9cc-0b30561b6da9' AND is_system = true;

-- Accountant
UPDATE role_templates SET
  permissions = '{sales.performance.view,sales.reports.view,insights.reports.view,insights.financial.view,insights.settlements.view,insights.reconciliations.view,operations.expenses.view,operations.expenses.approve,people.payroll.view,settings.activity.view,dashboard.profit.view}'::permission_key[],
  description = 'Read-only access to all financial data. Can approve settlements and reconciliations. No POS, no stock editing, no customer management.',
  updated_at = now()
WHERE id = '839d0fa6-b81e-4dd7-9f2a-4cfe8156f973' AND is_system = true;

-- Supervisor
UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.discount.apply,pos.rewards.redeem,sales.performance.view,sales.reports.view,stock.levels.view,customers.activity.view,operations.expenses.view,people.attendance.view,dashboard.alerts.view}'::permission_key[],
  description = 'Floor supervision. Can create sales, approve discounts, and view key operational data. No refunds, no staff management.',
  updated_at = now()
WHERE id = '60ba8887-cd72-44cd-9f9a-2130a4a1c93a' AND is_system = true;

-- Sales Rep
UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.discount.apply,pos.rewards.redeem,sales.performance.view,customers.overview.view,customers.activity.view,customers.rewards.view,dashboard.alerts.view}'::permission_key[],
  description = 'Internal/external sales tracking. Can create sales for assigned customers and view own performance only.',
  updated_at = now()
WHERE id = '154a796f-9e15-4cb7-98cb-bbd2636e539c' AND is_system = true;

-- Step 2: Propagate to business-specific copies (update by name match)

UPDATE role_templates SET
  permissions = '{dashboard.alerts.view,pos.access,pos.sale.create,pos.rewards.redeem,stock.levels.view,customers.overview.view,customers.activity.view,sales.performance.view}'::permission_key[],
  description = 'Transaction processing only. Can create sales and print receipts. No reports, no inventory editing, no settings access.',
  updated_at = now()
WHERE name = 'Cashier' AND is_system = false AND business_id IS NOT NULL;

UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.sale.refund,pos.discount.apply,pos.discount.override,pos.rewards.redeem,sales.performance.view,sales.reports.view,stock.catalog.view,stock.catalog.manage,stock.categories.view,stock.categories.manage,stock.levels.view,stock.adjust,stock.adjustments.history,stock.suppliers.manage,stock.orders.view,stock.orders.create,stock.orders.approve,customers.overview.view,customers.activity.view,customers.groups.manage,customers.rewards.view,customers.rewards.manage,operations.expenses.view,operations.expenses.record,operations.expenses.approve,insights.reports.view,insights.financial.view,people.attendance.view,people.attendance.manage,settings.activity.view,dashboard.alerts.view,dashboard.top_selling.view,dashboard.profit.view,dashboard.branch_performance.view}'::permission_key[],
  description = 'Can view performance reports and approve discounts/refunds within limits. Cannot manage staff, assign roles, or change business settings.',
  updated_at = now()
WHERE name = 'Manager' AND is_system = false AND business_id IS NOT NULL;

UPDATE role_templates SET
  permissions = '{sales.performance.view,sales.reports.view,insights.reports.view,insights.financial.view,insights.settlements.view,insights.reconciliations.view,operations.expenses.view,operations.expenses.approve,people.payroll.view,settings.activity.view,dashboard.profit.view}'::permission_key[],
  description = 'Read-only access to all financial data. Can approve settlements and reconciliations. No POS, no stock editing, no customer management.',
  updated_at = now()
WHERE name = 'Accountant' AND is_system = false AND business_id IS NOT NULL;

UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.discount.apply,pos.rewards.redeem,sales.performance.view,sales.reports.view,stock.levels.view,customers.activity.view,operations.expenses.view,people.attendance.view,dashboard.alerts.view}'::permission_key[],
  description = 'Floor supervision. Can create sales, approve discounts, and view key operational data. No refunds, no staff management.',
  updated_at = now()
WHERE name = 'Supervisor' AND is_system = false AND business_id IS NOT NULL;

UPDATE role_templates SET
  permissions = '{pos.access,pos.sale.create,pos.sale.cancel,pos.discount.apply,pos.rewards.redeem,sales.performance.view,customers.overview.view,customers.activity.view,customers.rewards.view,dashboard.alerts.view}'::permission_key[],
  description = 'Internal/external sales tracking. Can create sales for assigned customers and view own performance only.',
  updated_at = now()
WHERE name = 'Sales Rep' AND is_system = false AND business_id IS NOT NULL;
