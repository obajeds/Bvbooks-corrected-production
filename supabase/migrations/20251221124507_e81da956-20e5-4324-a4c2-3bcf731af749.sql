-- Remove old permissions for Maxwell (Inventory Officer)
DELETE FROM staff_permissions WHERE staff_id = '07377399-7314-4e72-84fa-e42690bbf557';

-- Insert correct Inventory Officer permissions
INSERT INTO staff_permissions (staff_id, permission)
SELECT '07377399-7314-4e72-84fa-e42690bbf557', unnest(ARRAY[
  'inventory.view', 
  'inventory.item.create', 
  'inventory.item.edit', 
  'inventory.item.delete', 
  'inventory.adjust.create', 
  'inventory.price.edit', 
  'inventory.price.view_cost', 
  'pos.access', 
  'pos.sale.create', 
  'reports.view.inventory'
]::permission_key[]);