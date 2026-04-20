-- Corrective migration: Fix Cooking Gas stock from 1200 to 450
-- Root cause: stale-data race condition in reconciliation apply logic

-- 1. Fix branch_stock
UPDATE public.branch_stock
SET quantity = 450, updated_at = now()
WHERE product_id = 'c27ae27d-9c43-4bcb-9896-d6eb4659de6a'
  AND branch_id = '02f1663f-48b3-4a08-94d7-2d7f807a7470';

-- 2. Recalculate global stock
UPDATE public.products
SET stock_quantity = (
  SELECT COALESCE(SUM(quantity), 0)
  FROM public.branch_stock
  WHERE product_id = 'c27ae27d-9c43-4bcb-9896-d6eb4659de6a'
    AND business_id = 'ffc3f457-89bf-45c6-a61b-2e52e7c956df'
)
WHERE id = 'c27ae27d-9c43-4bcb-9896-d6eb4659de6a';

-- 3. Audit trail
INSERT INTO public.stock_movements (
  business_id, product_id, branch_id, movement_type,
  quantity, previous_quantity, new_quantity,
  reference_type, notes, idempotency_key
) VALUES (
  'ffc3f457-89bf-45c6-a61b-2e52e7c956df',
  'c27ae27d-9c43-4bcb-9896-d6eb4659de6a',
  '02f1663f-48b3-4a08-94d7-2d7f807a7470',
  'out',
  750,
  1200,
  450,
  'reconciliation',
  'Corrective fix: reconciliation stale-data bug applied 1200 instead of 450',
  'corrective_fix_cooking_gas_1200_to_450'
);