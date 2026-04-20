
-- =====================================================
-- Enterprise-Grade Strict Role Template Permissions
-- Fixes: Manager, Supervisor, Accountant, Sales Staff
-- Adds: Cashier role
-- =====================================================

-- 1. UPDATE MANAGER - Operational control, NO financial ownership, NO settings, NO staff management
UPDATE role_templates
SET permissions = ARRAY[
  -- Sales Operations
  'pos.access', 'pos.sale.create', 'pos.sale.cancel', 'pos.sale.refund',
  'pos.discount.apply', 'pos.rewards.redeem',
  'sales.view', 'sales.view.all',
  -- Inventory Operations (no delete)
  'inventory.view', 'inventory.item.create', 'inventory.item.edit',
  'inventory.adjust.create', 'inventory.price.edit', 'inventory.price.view_cost',
  -- Customer Management
  'crm.view', 'crm.manage', 'crm.credit.manage',
  -- Operations
  'expenses.view', 'expenses.create',
  'approval.refund', 'approval.discount', 'approval.stock_adjustment',
  -- Limited Reports (daily summary only, NO financial, NO export)
  'reports.view.summary', 'reports.view.inventory',
  -- View staff list only (NO manage, NO suspend, NO permissions)
  'staff.view',
  -- Dashboard widgets
  'dashboard.profit.view', 'dashboard.alerts.view', 'dashboard.team_activity.view',
  'dashboard.top_selling.view', 'dashboard.staff_risk.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = true AND name = 'Manager';

-- Also update all business copies of Manager
UPDATE role_templates
SET permissions = ARRAY[
  'pos.access', 'pos.sale.create', 'pos.sale.cancel', 'pos.sale.refund',
  'pos.discount.apply', 'pos.rewards.redeem',
  'sales.view', 'sales.view.all',
  'inventory.view', 'inventory.item.create', 'inventory.item.edit',
  'inventory.adjust.create', 'inventory.price.edit', 'inventory.price.view_cost',
  'crm.view', 'crm.manage', 'crm.credit.manage',
  'expenses.view', 'expenses.create',
  'approval.refund', 'approval.discount', 'approval.stock_adjustment',
  'reports.view.summary', 'reports.view.inventory',
  'staff.view',
  'dashboard.profit.view', 'dashboard.alerts.view', 'dashboard.team_activity.view',
  'dashboard.top_selling.view', 'dashboard.staff_risk.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = false AND name = 'Manager' AND is_active = true;


-- 2. UPDATE SUPERVISOR - Floor supervision, limited control, NO financial, NO staff, NO settings
UPDATE role_templates
SET permissions = ARRAY[
  -- Sales (no delete, no refund without approval)
  'pos.access', 'pos.sale.create', 'pos.sale.cancel',
  'pos.discount.apply',
  'sales.view',
  -- Inventory (read-only)
  'inventory.view',
  -- Customers (view only)
  'crm.view',
  -- Operations (view expenses, record)
  'expenses.view', 'expenses.create',
  -- Limited reports (daily summary only)
  'reports.view.summary',
  -- Dashboard
  'dashboard.alerts.view', 'dashboard.top_selling.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = true AND name = 'Supervisor';

UPDATE role_templates
SET permissions = ARRAY[
  'pos.access', 'pos.sale.create', 'pos.sale.cancel',
  'pos.discount.apply',
  'sales.view',
  'inventory.view',
  'crm.view',
  'expenses.view', 'expenses.create',
  'reports.view.summary',
  'dashboard.alerts.view', 'dashboard.top_selling.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = false AND name = 'Supervisor' AND is_active = true;


-- 3. UPDATE SALES STAFF → Sales Representative
UPDATE role_templates
SET 
  name = 'Sales Rep',
  description = 'External/internal sales tracking. Can create sales for assigned customers and view own performance only.',
  permissions = ARRAY[
    -- Sales (create only, own view)
    'pos.access', 'pos.sale.create',
    'sales.view',
    -- Customer view
    'crm.view',
    -- Dashboard (basic)
    'dashboard.top_selling.view'
  ]::permission_key[],
  updated_at = now()
WHERE is_system = true AND name = 'Sales Staff';

UPDATE role_templates
SET 
  name = 'Sales Rep',
  description = 'External/internal sales tracking. Can create sales for assigned customers and view own performance only.',
  permissions = ARRAY[
    'pos.access', 'pos.sale.create',
    'sales.view',
    'crm.view',
    'dashboard.top_selling.view'
  ]::permission_key[],
  updated_at = now()
WHERE is_system = false AND name = 'Sales Staff' AND is_active = true;


-- 4. UPDATE ACCOUNTANT - Financial visibility ONLY, NO operational control
UPDATE role_templates
SET permissions = ARRAY[
  -- Financial visibility
  'sales.view', 'sales.view.all',
  'reports.view.summary', 'reports.view.financial', 'reports.view.inventory',
  'reports.export',
  -- Accounting
  'accounting.overview.view', 'accounting.settlements.view', 'accounting.reconciliations.view',
  -- Expenses (view only)
  'expenses.view',
  -- Inventory valuation (read-only)
  'inventory.view', 'inventory.price.view_cost',
  -- Dashboard (financial widgets only)
  'dashboard.profit.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = true AND name = 'Accountant';

UPDATE role_templates
SET permissions = ARRAY[
  'sales.view', 'sales.view.all',
  'reports.view.summary', 'reports.view.financial', 'reports.view.inventory',
  'reports.export',
  'accounting.overview.view', 'accounting.settlements.view', 'accounting.reconciliations.view',
  'expenses.view',
  'inventory.view', 'inventory.price.view_cost',
  'dashboard.profit.view'
]::permission_key[],
  updated_at = now()
WHERE is_system = false AND name = 'Accountant' AND is_active = true;


-- 5. ADD CASHIER ROLE (missing from system templates)
INSERT INTO role_templates (name, description, permissions, is_system, is_active, is_locked, discount_limit, refund_limit)
VALUES (
  'Cashier',
  'Transaction processing only. Can create sales and print receipts. No reports, no inventory editing, no settings access.',
  ARRAY[
    'pos.access', 'pos.sale.create',
    'pos.rewards.redeem',
    'sales.view',
    'crm.view'
  ]::permission_key[],
  true, true, false,
  0, -- No discount override
  0  -- No refund without manager PIN
)
ON CONFLICT DO NOTHING;


-- 6. Sync Cashier template to all existing businesses that have other role templates
INSERT INTO role_templates (business_id, name, description, permissions, is_system, is_active, is_locked, discount_limit, refund_limit)
SELECT DISTINCT
  rt.business_id,
  'Cashier',
  'Transaction processing only. Can create sales and print receipts. No reports, no inventory editing, no settings access.',
  ARRAY[
    'pos.access', 'pos.sale.create',
    'pos.rewards.redeem',
    'sales.view',
    'crm.view'
  ]::permission_key[],
  false, true, false,
  0, 0
FROM role_templates rt
WHERE rt.business_id IS NOT NULL
  AND rt.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM role_templates rt2 
    WHERE rt2.business_id = rt.business_id AND rt2.name = 'Cashier'
  );


-- 7. Now sync staff_permissions for any staff currently assigned to these roles
-- Update staff_permissions to match their role template for all staff with matching role names
-- This ensures existing staff get the corrected (tighter) permissions

-- For each staff member with a role matching a template name, sync their permissions
DO $$
DECLARE
  v_staff RECORD;
  v_template RECORD;
BEGIN
  FOR v_staff IN
    SELECT s.id as staff_id, s.role, s.business_id
    FROM staff s
    WHERE s.is_active = true
      AND s.role IS NOT NULL
      AND s.role IN ('manager', 'supervisor', 'cashier', 'sales_rep', 'accountant', 'sales staff')
  LOOP
    -- Find the matching role template for this business
    SELECT permissions INTO v_template
    FROM role_templates
    WHERE (
      (business_id = v_staff.business_id) 
      OR (business_id IS NULL AND is_system = true)
    )
    AND LOWER(name) = LOWER(
      CASE v_staff.role
        WHEN 'sales staff' THEN 'Sales Rep'
        WHEN 'sales_rep' THEN 'Sales Rep'
        ELSE v_staff.role
      END
    )
    AND is_active = true
    ORDER BY business_id NULLS LAST -- Prefer business-specific template
    LIMIT 1;
    
    IF v_template IS NOT NULL THEN
      -- Delete existing permissions
      DELETE FROM staff_permissions WHERE staff_id = v_staff.staff_id;
      
      -- Insert new tightened permissions
      INSERT INTO staff_permissions (staff_id, permission, granted_by)
      SELECT v_staff.staff_id, unnest(v_template.permissions), NULL
      ON CONFLICT (staff_id, permission) DO NOTHING;
    END IF;
  END LOOP;
END $$;
