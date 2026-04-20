
-- Reconstruct previous_quantity and new_quantity for backfilled stock movements
-- by working backwards from current verified branch_stock quantities.
--
-- Strategy: For each (product_id, branch_id), anchor on current branch_stock.quantity.
-- Order all movements newest-first. The newest movement's new_quantity = current_stock.
-- Each older movement reconstructs by accumulating the "reverse impact" of newer movements.

WITH reconstructed AS (
  SELECT
    sm.id,
    sm.notes,
    sm.quantity AS mov_qty,
    sm.movement_type,
    COALESCE(bs.quantity, 0) AS current_stock,
    -- Cumulative reverse impact of all movements NEWER than this one
    COALESCE(
      SUM(
        CASE
          WHEN sm.movement_type IN ('sale', 'out', 'damage', 'transfer_out')
            THEN sm.quantity
          WHEN sm.movement_type IN ('in', 'return', 'purchase', 'transfer_in')
            THEN -sm.quantity
          WHEN sm.movement_type = 'adjustment' AND sm.previous_quantity != 0 AND sm.new_quantity != 0
            THEN sm.previous_quantity - sm.new_quantity
          ELSE 0
        END
      ) OVER (
        PARTITION BY sm.product_id, sm.branch_id
        ORDER BY sm.created_at DESC, sm.id DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ),
      0
    ) AS cumulative_above
  FROM stock_movements sm
  LEFT JOIN branch_stock bs
    ON bs.product_id = sm.product_id AND bs.branch_id = sm.branch_id
  WHERE sm.branch_id IS NOT NULL
)
UPDATE stock_movements sm_target
SET
  -- new_quantity = what stock was AFTER this movement
  new_quantity = GREATEST(0, r.current_stock + r.cumulative_above),
  -- previous_quantity = new_quantity + quantity (for sales/out, stock was higher before)
  previous_quantity = GREATEST(0, r.current_stock + r.cumulative_above + r.mov_qty)
FROM reconstructed r
WHERE sm_target.id = r.id
  AND sm_target.notes LIKE 'Backfill:%'
