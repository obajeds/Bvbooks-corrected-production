-- Update Inventory Officer role - remove staff.view and sales.view.all, keep only inventory-related permissions
UPDATE role_templates 
SET permissions = ARRAY['inventory.view', 'inventory.item.create', 'inventory.item.edit', 'inventory.item.delete', 'inventory.adjust.create', 'inventory.price.edit', 'inventory.price.view_cost', 'pos.access', 'pos.sale.create', 'reports.view.inventory']::permission_key[],
    updated_at = now()
WHERE name = 'Inventory Officer' AND is_system = true;

-- Update Manager role - add reports.view.summary for dashboard access
UPDATE role_templates 
SET permissions = ARRAY['pos.access', 'pos.sale.create', 'pos.sale.cancel', 'pos.sale.refund', 'pos.discount.apply', 'inventory.view', 'sales.view', 'sales.view.all', 'reports.view.summary', 'reports.view.financial', 'crm.view', 'crm.manage', 'expenses.view', 'expenses.create', 'approval.refund', 'approval.discount', 'staff.view', 'staff.manage']::permission_key[],
    updated_at = now()
WHERE name = 'Manager' AND is_system = true;

-- Update Sales Staff role - minimal POS permissions only
UPDATE role_templates 
SET permissions = ARRAY['pos.access', 'pos.sale.create', 'crm.view', 'sales.view']::permission_key[],
    updated_at = now()
WHERE name = 'Sales Staff' AND is_system = true;

-- Update Accountant role - ensure proper financial access
UPDATE role_templates 
SET permissions = ARRAY['sales.view', 'sales.view.all', 'reports.view.summary', 'reports.view.financial', 'reports.view.inventory', 'reports.export', 'expenses.view', 'expenses.approve', 'accounting.view', 'accounting.manage', 'inventory.price.view_cost', 'audit.view']::permission_key[],
    updated_at = now()
WHERE name = 'Accountant' AND is_system = true;