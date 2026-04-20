
-- Insert 90 new plan_features rows (30 feature keys x 3 plans)
INSERT INTO public.plan_features (plan, feature_key, feature_name, category, is_enabled, description) VALUES
-- sales.minimum_price
('free', 'sales.minimum_price', 'Minimum Price Enforcement', 'Sales', false, 'Enforce minimum selling prices'),
('professional', 'sales.minimum_price', 'Minimum Price Enforcement', 'Sales', true, 'Enforce minimum selling prices'),
('enterprise', 'sales.minimum_price', 'Minimum Price Enforcement', 'Sales', true, 'Enforce minimum selling prices'),
-- sales.split_payments
('free', 'sales.split_payments', 'Split Payments', 'Sales', false, 'Accept split payment methods per transaction'),
('professional', 'sales.split_payments', 'Split Payments', 'Sales', false, 'Accept split payment methods per transaction'),
('enterprise', 'sales.split_payments', 'Split Payments', 'Sales', true, 'Accept split payment methods per transaction'),
-- sales.advanced_pricing
('free', 'sales.advanced_pricing', 'Advanced Pricing Rules', 'Sales', false, 'Branch-level and advanced pricing rules'),
('professional', 'sales.advanced_pricing', 'Advanced Pricing Rules', 'Sales', false, 'Branch-level and advanced pricing rules'),
('enterprise', 'sales.advanced_pricing', 'Advanced Pricing Rules', 'Sales', true, 'Branch-level and advanced pricing rules'),
-- stock.variance
('free', 'stock.variance', 'Stock Variance Tracking', 'Stock Control', false, 'Track stock variances and discrepancies'),
('professional', 'stock.variance', 'Stock Variance Tracking', 'Stock Control', true, 'Track stock variances and discrepancies'),
('enterprise', 'stock.variance', 'Stock Variance Tracking', 'Stock Control', true, 'Track stock variances and discrepancies'),
-- stock.no_backdating
('free', 'stock.no_backdating', 'No Backdating', 'Stock Control', false, 'Strict enforcement of no backdated entries'),
('professional', 'stock.no_backdating', 'No Backdating', 'Stock Control', false, 'Strict enforcement of no backdated entries'),
('enterprise', 'stock.no_backdating', 'No Backdating', 'Stock Control', true, 'Strict enforcement of no backdated entries'),
-- customers.credit_limits
('free', 'customers.credit_limits', 'Credit Limits', 'Customers', false, 'Set and enforce customer credit limits'),
('professional', 'customers.credit_limits', 'Credit Limits', 'Customers', true, 'Set and enforce customer credit limits'),
('enterprise', 'customers.credit_limits', 'Credit Limits', 'Customers', true, 'Set and enforce customer credit limits'),
-- customers.reminders
('free', 'customers.reminders', 'Payment Reminders', 'Customers', false, 'Send payment reminders to customers'),
('professional', 'customers.reminders', 'Payment Reminders', 'Customers', true, 'Manual payment reminders'),
('enterprise', 'customers.reminders', 'Payment Reminders', 'Customers', true, 'Automated payment reminders'),
-- customers.risk_indicators
('free', 'customers.risk_indicators', 'Customer Risk Indicators', 'Customers', false, 'View customer risk scoring and indicators'),
('professional', 'customers.risk_indicators', 'Customer Risk Indicators', 'Customers', false, 'View customer risk scoring and indicators'),
('enterprise', 'customers.risk_indicators', 'Customer Risk Indicators', 'Customers', true, 'View customer risk scoring and indicators'),
-- team.shift_access
('free', 'team.shift_access', 'Shift-Based Access', 'Team Activity', false, 'Restrict staff access by shift schedules'),
('professional', 'team.shift_access', 'Shift-Based Access', 'Team Activity', true, 'Restrict staff access by shift schedules'),
('enterprise', 'team.shift_access', 'Shift-Based Access', 'Team Activity', true, 'Restrict staff access by shift schedules'),
-- team.session_limits
('free', 'team.session_limits', 'Session/Device Limits', 'Team Activity', false, 'Limit concurrent sessions and devices per staff'),
('professional', 'team.session_limits', 'Session/Device Limits', 'Team Activity', true, 'Limit concurrent sessions and devices per staff'),
('enterprise', 'team.session_limits', 'Session/Device Limits', 'Team Activity', true, 'Limit concurrent sessions and devices per staff'),
-- team.branch_isolation
('free', 'team.branch_isolation', 'Branch Isolation', 'Team Activity', false, 'Isolate staff access to assigned branches'),
('professional', 'team.branch_isolation', 'Branch Isolation', 'Team Activity', true, 'Isolate staff access to assigned branches'),
('enterprise', 'team.branch_isolation', 'Branch Isolation', 'Team Activity', true, 'Isolate staff access to assigned branches'),
-- team.performance
('free', 'team.performance', 'Staff Performance Metrics', 'Team Activity', false, 'View staff performance and productivity metrics'),
('professional', 'team.performance', 'Staff Performance Metrics', 'Team Activity', false, 'View staff performance and productivity metrics'),
('enterprise', 'team.performance', 'Staff Performance Metrics', 'Team Activity', true, 'View staff performance and productivity metrics'),
-- expenses.limits
('free', 'expenses.limits', 'Expense Limits', 'Expenses', false, 'Set and enforce expense category limits'),
('professional', 'expenses.limits', 'Expense Limits', 'Expenses', true, 'Set and enforce expense category limits'),
('enterprise', 'expenses.limits', 'Expense Limits', 'Expenses', true, 'Set and enforce expense category limits'),
-- accounting.cash_flow
('free', 'accounting.cash_flow', 'Cash Flow', 'Accounting', false, 'View cash flow reports'),
('professional', 'accounting.cash_flow', 'Cash Flow', 'Accounting', true, 'View cash flow reports'),
('enterprise', 'accounting.cash_flow', 'Cash Flow', 'Accounting', true, 'View cash flow reports'),
-- accounting.reversals
('free', 'accounting.reversals', 'Reversals', 'Accounting', false, 'Reverse transactions (no delete)'),
('professional', 'accounting.reversals', 'Reversals', 'Accounting', true, 'Reverse transactions (no delete)'),
('enterprise', 'accounting.reversals', 'Reversals', 'Accounting', true, 'Reverse transactions (no delete)'),
-- accounting.consolidated
('free', 'accounting.consolidated', 'Consolidated Reports', 'Accounting', false, 'View consolidated multi-branch reports'),
('professional', 'accounting.consolidated', 'Consolidated Reports', 'Accounting', false, 'View consolidated multi-branch reports'),
('enterprise', 'accounting.consolidated', 'Consolidated Reports', 'Accounting', true, 'View consolidated multi-branch reports'),
-- accounting.inter_branch
('free', 'accounting.inter_branch', 'Inter-Branch Reconciliation', 'Accounting', false, 'Reconcile transactions between branches'),
('professional', 'accounting.inter_branch', 'Inter-Branch Reconciliation', 'Accounting', false, 'Reconcile transactions between branches'),
('enterprise', 'accounting.inter_branch', 'Inter-Branch Reconciliation', 'Accounting', true, 'Reconcile transactions between branches'),
-- approvals.multi_level
('free', 'approvals.multi_level', 'Multi-Level Approval Chains', 'Approvals', false, 'Configure multi-level approval workflows'),
('professional', 'approvals.multi_level', 'Multi-Level Approval Chains', 'Approvals', false, 'Configure multi-level approval workflows'),
('enterprise', 'approvals.multi_level', 'Multi-Level Approval Chains', 'Approvals', true, 'Configure multi-level approval workflows'),
-- notifications.discount_refund
('free', 'notifications.discount_refund', 'Discount/Refund Alerts', 'Notifications', false, 'Alerts for discounts and refund activities'),
('professional', 'notifications.discount_refund', 'Discount/Refund Alerts', 'Notifications', false, 'Alerts for discounts and refund activities'),
('enterprise', 'notifications.discount_refund', 'Discount/Refund Alerts', 'Notifications', true, 'Alerts for discounts and refund activities'),
-- notifications.risk_pattern
('free', 'notifications.risk_pattern', 'Risk Pattern Alerts', 'Notifications', false, 'Alerts for suspicious risk patterns'),
('professional', 'notifications.risk_pattern', 'Risk Pattern Alerts', 'Notifications', false, 'Alerts for suspicious risk patterns'),
('enterprise', 'notifications.risk_pattern', 'Risk Pattern Alerts', 'Notifications', true, 'Alerts for suspicious risk patterns'),
-- insights.shrinkage
('free', 'insights.shrinkage', 'Stock Shrinkage Signals', 'Business Insights', false, 'Detect stock shrinkage patterns'),
('professional', 'insights.shrinkage', 'Stock Shrinkage Signals', 'Business Insights', true, 'Detect stock shrinkage patterns'),
('enterprise', 'insights.shrinkage', 'Stock Shrinkage Signals', 'Business Insights', true, 'Detect stock shrinkage patterns'),
-- settings.subscription
('free', 'settings.subscription', 'Subscription Management', 'Settings', false, 'Manage subscription plan'),
('professional', 'settings.subscription', 'Subscription Management', 'Settings', true, 'Manage subscription plan'),
('enterprise', 'settings.subscription', 'Subscription Management', 'Settings', true, 'Manage subscription plan'),
-- settings.addons
('free', 'settings.addons', 'Add-ons Management', 'Settings', false, 'Purchase and manage add-ons'),
('professional', 'settings.addons', 'Add-ons Management', 'Settings', true, 'Purchase and manage add-ons'),
('enterprise', 'settings.addons', 'Add-ons Management', 'Settings', true, 'Purchase and manage add-ons'),
-- settings.notifications_config
('free', 'settings.notifications_config', 'Notification Settings', 'Settings', false, 'Configure notification preferences'),
('professional', 'settings.notifications_config', 'Notification Settings', 'Settings', true, 'Configure notification preferences'),
('enterprise', 'settings.notifications_config', 'Notification Settings', 'Settings', true, 'Configure notification preferences'),
-- settings.branding
('free', 'settings.branding', 'Branding', 'Settings', false, 'Customize business branding'),
('professional', 'settings.branding', 'Branding', 'Settings', true, 'Customize business branding'),
('enterprise', 'settings.branding', 'Branding', 'Settings', true, 'Customize business branding'),
-- settings.permissions
('free', 'settings.permissions', 'Permissions Management', 'Settings', false, 'Manage role permissions'),
('professional', 'settings.permissions', 'Permissions Management', 'Settings', true, 'Manage role permissions'),
('enterprise', 'settings.permissions', 'Permissions Management', 'Settings', true, 'Manage role permissions'),
-- settings.units
('free', 'settings.units', 'Measurement Units', 'Settings', false, 'Configure measurement units'),
('professional', 'settings.units', 'Measurement Units', 'Settings', true, 'Configure measurement units'),
('enterprise', 'settings.units', 'Measurement Units', 'Settings', true, 'Configure measurement units'),
-- settings.approval_rules
('free', 'settings.approval_rules', 'Approval Rules', 'Settings', false, 'Configure approval thresholds and rules'),
('professional', 'settings.approval_rules', 'Approval Rules', 'Settings', false, 'Configure approval thresholds and rules'),
('enterprise', 'settings.approval_rules', 'Approval Rules', 'Settings', true, 'Configure approval thresholds and rules'),
-- settings.branch_policies
('free', 'settings.branch_policies', 'Branch Policies', 'Settings', false, 'Configure advanced branch-level policies'),
('professional', 'settings.branch_policies', 'Branch Policies', 'Settings', false, 'Configure advanced branch-level policies'),
('enterprise', 'settings.branch_policies', 'Branch Policies', 'Settings', true, 'Configure advanced branch-level policies'),
-- settings.control_configs
('free', 'settings.control_configs', 'Control Configurations', 'Settings', false, 'Advanced control and security configurations'),
('professional', 'settings.control_configs', 'Control Configurations', 'Settings', false, 'Advanced control and security configurations'),
('enterprise', 'settings.control_configs', 'Control Configurations', 'Settings', true, 'Advanced control and security configurations');

-- Fix 2 existing rows
UPDATE public.plan_features SET is_enabled = true, updated_at = now() WHERE plan = 'professional' AND feature_key = 'customers.credit';
UPDATE public.plan_features SET is_enabled = true, updated_at = now() WHERE plan = 'professional' AND feature_key = 'settings.hours';
