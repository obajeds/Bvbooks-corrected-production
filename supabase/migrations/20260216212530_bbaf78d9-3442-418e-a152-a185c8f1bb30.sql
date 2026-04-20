-- Add all new permission keys to the database enum that exist in TypeScript but not in the DB

-- Sales Performance
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'sales.performance.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'sales.reports.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'sales.data.export';

-- Stock Control
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.catalog.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.catalog.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.categories.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.categories.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.levels.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.adjust';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.adjustments.history';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.suppliers.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.orders.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.orders.create';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'stock.orders.approve';

-- Customers
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'customers.overview.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'customers.activity.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'customers.groups.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'customers.rewards.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'customers.rewards.manage';

-- Operations
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.expenses.record';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.expenses.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.expenses.approve';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.approvals.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.alerts.receive';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'operations.alerts.resolve';

-- Business Insights
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'insights.reports.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'insights.financial.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'insights.settlements.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'insights.reconciliations.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'insights.reports.export';

-- People & Access
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.team.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.team.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.roles.assign';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.departments.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.departments.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.attendance.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.attendance.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.payroll.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.payroll.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.leave.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'people.leave.approve';

-- Settings
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.business.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.business.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.activity.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.activity.export';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.help.access';

-- Legacy keys that were in TypeScript but missing from DB
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'support.help_center.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'support.chat.access';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'support.brm.contact';