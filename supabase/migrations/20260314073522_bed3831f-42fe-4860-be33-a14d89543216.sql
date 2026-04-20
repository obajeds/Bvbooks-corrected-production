-- Backfill missing stock movements for offline-synced sales
INSERT INTO stock_movements (
  business_id, branch_id, product_id, movement_type,
  quantity, previous_quantity, new_quantity,
  notes, reference_type, reference_id, created_by, created_at
)
SELECT
  s.business_id,
  s.branch_id,
  si.product_id,
  'sale',
  si.quantity,
  0,
  0,
  'Backfill: offline sync sale - Invoice ' || s.invoice_number,
  'sale',
  s.id,
  s.created_by,
  s.created_at
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
WHERE si.product_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM stock_movements sm
    WHERE sm.reference_id = s.id
      AND sm.reference_type = 'sale'
      AND sm.product_id = si.product_id
  )
  AND EXISTS (
    SELECT 1 FROM offline_sales_queue osq
    WHERE osq.id = s.id AND osq.status = 'synced'
  );