-- Populate plan_features table with all features for each plan tier
-- This enables proper feature gating based on subscription plans

-- Clear any existing data first
TRUNCATE TABLE plan_features;

-- FREE PLAN FEATURES
INSERT INTO plan_features (plan, feature_key, feature_name, category, is_enabled, limits, description) VALUES
-- Sales
('free', 'sales.create', 'Create Sales', 'Sales', true, '{}', 'Basic POS sales creation'),
('free', 'sales.view', 'View Sales', 'Sales', true, '{}', 'View sales history'),
('free', 'sales.discount', 'Apply Discounts', 'Sales', false, '{}', 'Apply discounts to sales'),
('free', 'sales.refund', 'Process Refunds', 'Sales', false, '{}', 'Process refunds'),

-- Stock Control
('free', 'stock.in_out', 'Stock In/Out', 'Stock Control', true, '{}', 'Basic stock movements'),
('free', 'stock.adjustments', 'Stock Adjustments', 'Stock Control', true, '{}', 'Manual stock adjustments'),
('free', 'stock.transfers', 'Stock Transfers', 'Stock Control', false, '{}', 'Transfer between branches'),
('free', 'stock.branch_pricing', 'Branch-level Pricing', 'Stock Control', false, '{}', 'Different prices per branch'),

-- Customers
('free', 'customers.list', 'Customer List', 'Customers', true, '{}', 'View customer list'),
('free', 'customers.history', 'Customer History', 'Customers', true, '{}', 'View customer purchase history'),
('free', 'customers.credit', 'Credit Sales', 'Customers', false, '{}', 'Allow credit sales'),
('free', 'customers.groups', 'Customer Groups', 'Customers', false, '{}', 'Organize customers into groups'),

-- Team Activity
('free', 'team.basic_accounts', 'Basic Staff Accounts', 'Team Activity', true, '{}', 'Basic staff accounts'),
('free', 'team.advanced_roles', 'Advanced Roles', 'Team Activity', false, '{}', 'Custom role permissions'),
('free', 'team.hrm', 'HRM Features', 'Team Activity', false, '{}', 'Attendance, leave, payroll'),
('free', 'team.risk_scoring', 'Staff Risk Scoring', 'Team Activity', false, '{}', 'Risk-based staff monitoring'),

-- Expenses
('free', 'expenses.recording', 'Expense Recording', 'Expenses', false, '{}', 'Record business expenses'),
('free', 'expenses.categories', 'Expense Categories', 'Expenses', false, '{}', 'Categorize expenses'),
('free', 'expenses.budgets', 'Expense Budgets', 'Expenses', false, '{}', 'Set branch expense budgets'),

-- Accounting
('free', 'accounting.sales_summary', 'Sales Summary', 'Accounting', true, '{}', 'Basic sales summary'),
('free', 'accounting.cash_balance', 'Cash Balance', 'Accounting', true, '{}', 'View cash balance'),
('free', 'accounting.profit_loss', 'Profit & Loss', 'Accounting', false, '{}', 'Profit and loss reports'),
('free', 'accounting.branch_pl', 'Branch-level P&L', 'Accounting', false, '{}', 'Per-branch P&L'),

-- Business Insights
('free', 'insights.daily_snapshot', 'Daily Sales Snapshot', 'Business Insights', true, '{}', 'Daily sales overview'),
('free', 'insights.low_stock', 'Low Stock Alerts', 'Business Insights', true, '{}', 'Low stock notifications'),
('free', 'insights.loss_risk', 'Loss Risk Indicators', 'Business Insights', false, '{}', 'Loss prevention metrics'),
('free', 'insights.branch_trends', 'Branch Performance Trends', 'Business Insights', false, '{}', 'Branch comparison analytics'),

-- Approvals
('free', 'approvals.stock', 'Stock Approvals', 'Approvals', false, '{}', 'Stock adjustment approvals'),
('free', 'approvals.discount', 'Discount Approvals', 'Approvals', false, '{}', 'Discount approvals'),
('free', 'approvals.refund', 'Refund Approvals', 'Approvals', false, '{}', 'Refund approvals'),
('free', 'approvals.expense', 'Expense Approvals', 'Approvals', false, '{}', 'Expense approvals'),

-- Notifications
('free', 'notifications.low_stock', 'Low Stock Alerts', 'Notifications', true, '{}', 'Low stock notifications'),
('free', 'notifications.in_app', 'In-App Notifications', 'Notifications', false, '{}', 'Full in-app notifications'),
('free', 'notifications.after_hours', 'After-Hours Alerts', 'Notifications', false, '{}', 'After-hours activity alerts'),

-- Activity Log
('free', 'activity.sales_stock', 'Sales & Stock Logs', 'Activity Log', true, '{}', 'Basic activity logs'),
('free', 'activity.full_audit', 'Full Audit Trail', 'Activity Log', false, '{}', 'Complete audit trail'),
('free', 'activity.export', 'Export Logs', 'Activity Log', false, '{}', 'Export activity logs'),

-- Settings
('free', 'settings.business_profile', 'Business Profile', 'Settings', true, '{}', 'Basic business settings'),
('free', 'settings.receipt_tax', 'Receipt & Tax Setup', 'Settings', true, '{}', 'Receipt and tax configuration'),
('free', 'settings.branches', 'Branch Management', 'Settings', false, '{}', 'Manage multiple branches'),
('free', 'settings.hours', 'Business Hours', 'Settings', false, '{}', 'Configure business hours');

-- BASIC PLAN FEATURES
INSERT INTO plan_features (plan, feature_key, feature_name, category, is_enabled, limits, description) VALUES
-- Sales
('basic', 'sales.create', 'Create Sales', 'Sales', true, '{}', 'POS sales creation'),
('basic', 'sales.view', 'View Sales', 'Sales', true, '{}', 'View sales history'),
('basic', 'sales.discount', 'Apply Discounts', 'Sales', true, '{"max_percent": 15}', 'Apply discounts with limits'),
('basic', 'sales.refund', 'Process Refunds', 'Sales', true, '{"requires_approval": true}', 'Restricted refunds'),

-- Stock Control
('basic', 'stock.in_out', 'Stock In/Out', 'Stock Control', true, '{}', 'Stock movements'),
('basic', 'stock.adjustments', 'Stock Adjustments', 'Stock Control', true, '{"threshold": 10}', 'Adjustments with thresholds'),
('basic', 'stock.transfers', 'Stock Transfers', 'Stock Control', false, '{}', 'Transfer between branches'),
('basic', 'stock.branch_pricing', 'Branch-level Pricing', 'Stock Control', false, '{}', 'Different prices per branch'),

-- Customers
('basic', 'customers.list', 'Customer List', 'Customers', true, '{}', 'View customer list'),
('basic', 'customers.history', 'Customer History', 'Customers', true, '{}', 'View customer purchase history'),
('basic', 'customers.credit', 'Credit Sales', 'Customers', true, '{}', 'Credit sales with limits'),
('basic', 'customers.groups', 'Customer Groups', 'Customers', true, '{}', 'Organize customers into groups'),

-- Team Activity
('basic', 'team.basic_accounts', 'Basic Staff Accounts', 'Team Activity', true, '{}', 'Staff accounts'),
('basic', 'team.advanced_roles', 'Advanced Roles', 'Team Activity', true, '{}', 'Custom role permissions'),
('basic', 'team.hrm', 'HRM Features', 'Team Activity', false, '{}', 'Attendance, leave, payroll'),
('basic', 'team.risk_scoring', 'Staff Risk Scoring', 'Team Activity', false, '{}', 'Risk-based staff monitoring'),

-- Expenses
('basic', 'expenses.recording', 'Expense Recording', 'Expenses', true, '{}', 'Record business expenses'),
('basic', 'expenses.categories', 'Expense Categories', 'Expenses', true, '{}', 'Categorize expenses'),
('basic', 'expenses.budgets', 'Expense Budgets', 'Expenses', false, '{}', 'Set branch expense budgets'),

-- Accounting
('basic', 'accounting.sales_summary', 'Sales Summary', 'Accounting', true, '{}', 'Sales summary'),
('basic', 'accounting.cash_balance', 'Cash Balance', 'Accounting', true, '{}', 'Cash balance view'),
('basic', 'accounting.profit_loss', 'Profit & Loss', 'Accounting', true, '{}', 'Profit and loss reports'),
('basic', 'accounting.branch_pl', 'Branch-level P&L', 'Accounting', false, '{}', 'Per-branch P&L'),

-- Business Insights
('basic', 'insights.daily_snapshot', 'Daily Sales Snapshot', 'Business Insights', true, '{}', 'Daily sales overview'),
('basic', 'insights.low_stock', 'Low Stock Alerts', 'Business Insights', true, '{}', 'Low stock notifications'),
('basic', 'insights.loss_risk', 'Loss Risk Indicators', 'Business Insights', true, '{}', 'Basic loss risk signals'),
('basic', 'insights.branch_trends', 'Branch Performance Trends', 'Business Insights', false, '{}', 'Branch comparison analytics'),

-- Approvals
('basic', 'approvals.stock', 'Stock Approvals', 'Approvals', true, '{"limited": true}', 'Limited stock approvals'),
('basic', 'approvals.discount', 'Discount Approvals', 'Approvals', false, '{}', 'Discount approvals'),
('basic', 'approvals.refund', 'Refund Approvals', 'Approvals', false, '{}', 'Refund approvals'),
('basic', 'approvals.expense', 'Expense Approvals', 'Approvals', false, '{}', 'Expense approvals'),

-- Notifications
('basic', 'notifications.low_stock', 'Low Stock Alerts', 'Notifications', true, '{}', 'Low stock notifications'),
('basic', 'notifications.in_app', 'In-App Notifications', 'Notifications', true, '{}', 'In-app notifications'),
('basic', 'notifications.after_hours', 'After-Hours Alerts', 'Notifications', false, '{}', 'After-hours activity alerts'),

-- Activity Log
('basic', 'activity.sales_stock', 'Sales & Stock Logs', 'Activity Log', true, '{}', 'Activity logs'),
('basic', 'activity.full_audit', 'Full Audit Trail', 'Activity Log', false, '{}', 'Complete audit trail'),
('basic', 'activity.export', 'Export Logs', 'Activity Log', true, '{"limited": true}', 'Limited export'),

-- Settings
('basic', 'settings.business_profile', 'Business Profile', 'Settings', true, '{}', 'Business settings'),
('basic', 'settings.receipt_tax', 'Receipt & Tax Setup', 'Settings', true, '{}', 'Receipt and tax configuration'),
('basic', 'settings.branches', 'Branch Management', 'Settings', true, '{}', 'Manage multiple branches'),
('basic', 'settings.hours', 'Business Hours', 'Settings', false, '{}', 'Configure business hours');

-- PREMIUM PLAN FEATURES
INSERT INTO plan_features (plan, feature_key, feature_name, category, is_enabled, limits, description) VALUES
-- Sales
('premium', 'sales.create', 'Create Sales', 'Sales', true, '{}', 'Full POS features'),
('premium', 'sales.view', 'View Sales', 'Sales', true, '{}', 'View sales history'),
('premium', 'sales.discount', 'Apply Discounts', 'Sales', true, '{}', 'Full discount controls'),
('premium', 'sales.refund', 'Process Refunds', 'Sales', true, '{}', 'Approval-based refunds'),

-- Stock Control
('premium', 'stock.in_out', 'Stock In/Out', 'Stock Control', true, '{}', 'Stock movements'),
('premium', 'stock.adjustments', 'Stock Adjustments', 'Stock Control', true, '{}', 'Full adjustment controls'),
('premium', 'stock.transfers', 'Stock Transfers', 'Stock Control', true, '{}', 'Multi-branch transfers'),
('premium', 'stock.branch_pricing', 'Branch-level Pricing', 'Stock Control', true, '{}', 'Different prices per branch'),

-- Customers
('premium', 'customers.list', 'Customer List', 'Customers', true, '{}', 'View customer list'),
('premium', 'customers.history', 'Customer History', 'Customers', true, '{}', 'View customer purchase history'),
('premium', 'customers.credit', 'Credit Sales', 'Customers', true, '{}', 'Full credit management'),
('premium', 'customers.groups', 'Customer Groups', 'Customers', true, '{}', 'Customer groups with risk indicators'),

-- Team Activity
('premium', 'team.basic_accounts', 'Basic Staff Accounts', 'Team Activity', true, '{}', 'Staff accounts'),
('premium', 'team.advanced_roles', 'Advanced Roles', 'Team Activity', true, '{}', 'Full role enforcement'),
('premium', 'team.hrm', 'HRM Features', 'Team Activity', true, '{}', 'Attendance, leave, payroll'),
('premium', 'team.risk_scoring', 'Staff Risk Scoring', 'Team Activity', true, '{}', 'Risk-based staff monitoring'),

-- Expenses
('premium', 'expenses.recording', 'Expense Recording', 'Expenses', true, '{}', 'Record business expenses'),
('premium', 'expenses.categories', 'Expense Categories', 'Expenses', true, '{}', 'Categorize expenses'),
('premium', 'expenses.budgets', 'Expense Budgets', 'Expenses', true, '{}', 'Branch expense budgets'),

-- Accounting
('premium', 'accounting.sales_summary', 'Sales Summary', 'Accounting', true, '{}', 'Sales summary'),
('premium', 'accounting.cash_balance', 'Cash Balance', 'Accounting', true, '{}', 'Cash balance view'),
('premium', 'accounting.profit_loss', 'Profit & Loss', 'Accounting', true, '{}', 'Full P&L reports'),
('premium', 'accounting.branch_pl', 'Branch-level P&L', 'Accounting', true, '{}', 'Per-branch P&L'),

-- Business Insights
('premium', 'insights.daily_snapshot', 'Daily Sales Snapshot', 'Business Insights', true, '{}', 'Daily sales overview'),
('premium', 'insights.low_stock', 'Low Stock Alerts', 'Business Insights', true, '{}', 'Low stock notifications'),
('premium', 'insights.loss_risk', 'Loss Risk Indicators', 'Business Insights', true, '{}', 'Full loss prevention'),
('premium', 'insights.branch_trends', 'Branch Performance Trends', 'Business Insights', true, '{}', 'Branch comparison analytics'),

-- Approvals
('premium', 'approvals.stock', 'Stock Approvals', 'Approvals', true, '{}', 'Stock adjustment approvals'),
('premium', 'approvals.discount', 'Discount Approvals', 'Approvals', true, '{}', 'Discount approvals'),
('premium', 'approvals.refund', 'Refund Approvals', 'Approvals', true, '{}', 'Refund approvals'),
('premium', 'approvals.expense', 'Expense Approvals', 'Approvals', true, '{}', 'Expense approvals'),

-- Notifications
('premium', 'notifications.low_stock', 'Low Stock Alerts', 'Notifications', true, '{}', 'Low stock notifications'),
('premium', 'notifications.in_app', 'In-App Notifications', 'Notifications', true, '{}', 'Full notifications'),
('premium', 'notifications.after_hours', 'After-Hours Alerts', 'Notifications', true, '{}', 'After-hours activity alerts'),

-- Activity Log
('premium', 'activity.sales_stock', 'Sales & Stock Logs', 'Activity Log', true, '{}', 'Activity logs'),
('premium', 'activity.full_audit', 'Full Audit Trail', 'Activity Log', true, '{}', 'Immutable audit trail'),
('premium', 'activity.export', 'Export Logs', 'Activity Log', true, '{}', 'Full export'),

-- Settings
('premium', 'settings.business_profile', 'Business Profile', 'Settings', true, '{}', 'Business settings'),
('premium', 'settings.receipt_tax', 'Receipt & Tax Setup', 'Settings', true, '{}', 'Receipt and tax configuration'),
('premium', 'settings.branches', 'Branch Management', 'Settings', true, '{}', 'Manage multiple branches'),
('premium', 'settings.hours', 'Business Hours', 'Settings', true, '{}', 'Configure business hours');

-- TRIAL PLAN FEATURES (same as Premium)
INSERT INTO plan_features (plan, feature_key, feature_name, category, is_enabled, limits, description) VALUES
-- Sales
('trial', 'sales.create', 'Create Sales', 'Sales', true, '{}', 'Full POS features'),
('trial', 'sales.view', 'View Sales', 'Sales', true, '{}', 'View sales history'),
('trial', 'sales.discount', 'Apply Discounts', 'Sales', true, '{}', 'Full discount controls'),
('trial', 'sales.refund', 'Process Refunds', 'Sales', true, '{}', 'Approval-based refunds'),

-- Stock Control
('trial', 'stock.in_out', 'Stock In/Out', 'Stock Control', true, '{}', 'Stock movements'),
('trial', 'stock.adjustments', 'Stock Adjustments', 'Stock Control', true, '{}', 'Full adjustment controls'),
('trial', 'stock.transfers', 'Stock Transfers', 'Stock Control', true, '{}', 'Multi-branch transfers'),
('trial', 'stock.branch_pricing', 'Branch-level Pricing', 'Stock Control', true, '{}', 'Different prices per branch'),

-- Customers
('trial', 'customers.list', 'Customer List', 'Customers', true, '{}', 'View customer list'),
('trial', 'customers.history', 'Customer History', 'Customers', true, '{}', 'View customer purchase history'),
('trial', 'customers.credit', 'Credit Sales', 'Customers', true, '{}', 'Full credit management'),
('trial', 'customers.groups', 'Customer Groups', 'Customers', true, '{}', 'Customer groups with risk indicators'),

-- Team Activity
('trial', 'team.basic_accounts', 'Basic Staff Accounts', 'Team Activity', true, '{}', 'Staff accounts'),
('trial', 'team.advanced_roles', 'Advanced Roles', 'Team Activity', true, '{}', 'Full role enforcement'),
('trial', 'team.hrm', 'HRM Features', 'Team Activity', true, '{}', 'Attendance, leave, payroll'),
('trial', 'team.risk_scoring', 'Staff Risk Scoring', 'Team Activity', true, '{}', 'Risk-based staff monitoring'),

-- Expenses
('trial', 'expenses.recording', 'Expense Recording', 'Expenses', true, '{}', 'Record business expenses'),
('trial', 'expenses.categories', 'Expense Categories', 'Expenses', true, '{}', 'Categorize expenses'),
('trial', 'expenses.budgets', 'Expense Budgets', 'Expenses', true, '{}', 'Branch expense budgets'),

-- Accounting
('trial', 'accounting.sales_summary', 'Sales Summary', 'Accounting', true, '{}', 'Sales summary'),
('trial', 'accounting.cash_balance', 'Cash Balance', 'Accounting', true, '{}', 'Cash balance view'),
('trial', 'accounting.profit_loss', 'Profit & Loss', 'Accounting', true, '{}', 'Full P&L reports'),
('trial', 'accounting.branch_pl', 'Branch-level P&L', 'Accounting', true, '{}', 'Per-branch P&L'),

-- Business Insights
('trial', 'insights.daily_snapshot', 'Daily Sales Snapshot', 'Business Insights', true, '{}', 'Daily sales overview'),
('trial', 'insights.low_stock', 'Low Stock Alerts', 'Business Insights', true, '{}', 'Low stock notifications'),
('trial', 'insights.loss_risk', 'Loss Risk Indicators', 'Business Insights', true, '{}', 'Full loss prevention'),
('trial', 'insights.branch_trends', 'Branch Performance Trends', 'Business Insights', true, '{}', 'Branch comparison analytics'),

-- Approvals
('trial', 'approvals.stock', 'Stock Approvals', 'Approvals', true, '{}', 'Stock adjustment approvals'),
('trial', 'approvals.discount', 'Discount Approvals', 'Approvals', true, '{}', 'Discount approvals'),
('trial', 'approvals.refund', 'Refund Approvals', 'Approvals', true, '{}', 'Refund approvals'),
('trial', 'approvals.expense', 'Expense Approvals', 'Approvals', true, '{}', 'Expense approvals'),

-- Notifications
('trial', 'notifications.low_stock', 'Low Stock Alerts', 'Notifications', true, '{}', 'Low stock notifications'),
('trial', 'notifications.in_app', 'In-App Notifications', 'Notifications', true, '{}', 'Full notifications'),
('trial', 'notifications.after_hours', 'After-Hours Alerts', 'Notifications', true, '{}', 'After-hours activity alerts'),

-- Activity Log
('trial', 'activity.sales_stock', 'Sales & Stock Logs', 'Activity Log', true, '{}', 'Activity logs'),
('trial', 'activity.full_audit', 'Full Audit Trail', 'Activity Log', true, '{}', 'Immutable audit trail'),
('trial', 'activity.export', 'Export Logs', 'Activity Log', true, '{}', 'Full export'),

-- Settings
('trial', 'settings.business_profile', 'Business Profile', 'Settings', true, '{}', 'Business settings'),
('trial', 'settings.receipt_tax', 'Receipt & Tax Setup', 'Settings', true, '{}', 'Receipt and tax configuration'),
('trial', 'settings.branches', 'Branch Management', 'Settings', true, '{}', 'Manage multiple branches'),
('trial', 'settings.hours', 'Business Hours', 'Settings', true, '{}', 'Configure business hours');

-- Update plan_limits to include trial plan
INSERT INTO plan_limits (plan, max_branches, max_staff, max_products, monthly_price, currency, description, trial_days)
VALUES ('trial', 3, 15, NULL, 0, 'NGN', '30-day trial with Premium features', 30)
ON CONFLICT DO NOTHING;