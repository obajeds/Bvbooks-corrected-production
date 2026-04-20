-- 1. Insert system-level Inventory Officer template
INSERT INTO role_templates (
  business_id, name, description, permissions,
  discount_limit, refund_limit,
  is_system, is_active, is_locked
) VALUES (
  NULL,
  'Inventory Officer',
  'Stock-focused role for staff who manage inventory, categories, suppliers, and purchase orders. No POS, sales, or financial access.',
  ARRAY[
    'stock.catalog.view', 'stock.catalog.manage',
    'stock.categories.view', 'stock.categories.manage',
    'stock.levels.view',
    'stock.adjust', 'stock.adjustments.history',
    'stock.suppliers.manage',
    'stock.orders.view', 'stock.orders.create', 'stock.orders.approve',
    'dashboard.alerts.view',
    'settings.activity.view'
  ]::permission_key[],
  0, 0,
  true, true, true
);

-- 2. Propagate to all existing businesses
INSERT INTO role_templates (
  business_id, name, description, permissions,
  discount_limit, refund_limit,
  is_system, is_active, is_locked
)
SELECT
  b.id,
  'Inventory Officer',
  'Stock-focused role for staff who manage inventory, categories, suppliers, and purchase orders. No POS, sales, or financial access.',
  ARRAY[
    'stock.catalog.view', 'stock.catalog.manage',
    'stock.categories.view', 'stock.categories.manage',
    'stock.levels.view',
    'stock.adjust', 'stock.adjustments.history',
    'stock.suppliers.manage',
    'stock.orders.view', 'stock.orders.create', 'stock.orders.approve',
    'dashboard.alerts.view',
    'settings.activity.view'
  ]::permission_key[],
  0, 0,
  false, true, false
FROM businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM role_templates rt
  WHERE rt.business_id = b.id AND rt.name = 'Inventory Officer'
);