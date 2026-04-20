-- Add new dashboard permission values to the permission_key enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.profit.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.alerts.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.team_activity.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.top_selling.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.staff_risk.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.branch_performance.view';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'dashboard.after_hours.view';