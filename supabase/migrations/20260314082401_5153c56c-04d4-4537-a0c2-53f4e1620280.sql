
-- Recompute ALL stock movement snapshots (previous_quantity, new_quantity)
-- for all movement types, working backwards from current branch_stock.
--
-- Strategy: For each (product_id, branch_id), anchor on current branch_stock.quantity.
-- Order movements newest-first. Compute cumulative reverse impact of newer movements
-- to determine what stock was at each point in time.

WITH ordered_movements AS (
  SELECT
    sm.id,
    sm.product_id,
    sm.branch_id,
    sm.quantity AS mov_qty,
    sm.movement_type,
    sm.created_at,
    COALESCE(bs.quantity, 0) AS current_stock,
    ROW_NUMBER() OVER (
      PARTITION BY sm.product_id, sm.branch_id
      ORDER BY sm.created_at DESC, sm.id DESC
    ) AS rn
  FROM stock_movements sm
  LEFT JOIN branch_stock bs
    ON bs.product_id = sm.product_id AND bs.branch_id = sm.branch_id
  WHERE sm.branch_id IS NOT NULL
),
with_cumulative AS (
  SELECT
    om.id,
    om.current_stock,
    om.mov_qty,
    om.movement_type,
    -- Sum of reverse-impacts of all NEWER rows (rn < current rn means newer)
    COALESCE(
      SUM(
        CASE
          WHEN om2.movement_type IN ('sale', 'out', 'damage', 'transfer_out')
            THEN om2.mov_qty  -- these removed stock, so adding back
          WHEN om2.movement_type IN ('in', 'return', 'purchase', 'transfer_in')
            THEN -om2.mov_qty  -- these added stock, so removing
          WHEN om2.movement_type = 'adjustment'
            THEN om2.mov_qty  -- adjustments: quantity field = amount removed (prev-new for decrease)
          ELSE 0
        END
      ) FILTER (WHERE om2.rn < om.rn),
      0
    ) AS cumulative_newer_impact
  FROM ordered_movements om
  LEFT JOIN ordered_movements om2
    ON om2.product_id = om.product_id
    AND om2.branch_id = om.branch_id
  GROUP BY om.id, om.current_stock, om.mov_qty, om.movement_type, om.rn
)
UPDATE stock_movements sm_target
SET
  new_quantity = GREATEST(0, wc.current_stock + wc.cumulative_newer_impact),
  previous_quantity = GREATEST(0, wc.current_stock + wc.cumulative_newer_impact +
    CASE
      WHEN wc.movement_type IN ('sale', 'out', 'damage', 'transfer_out')
        THEN wc.mov_qty
      WHEN wc.movement_type IN ('in', 'return', 'purchase', 'transfer_in')
        THEN -wc.mov_qty
      WHEN wc.movement_type = 'adjustment'
        THEN wc.mov_qty
      ELSE 0
    END
  )
FROM with_cumulative wc
WHERE sm_target.id = wc.id;
