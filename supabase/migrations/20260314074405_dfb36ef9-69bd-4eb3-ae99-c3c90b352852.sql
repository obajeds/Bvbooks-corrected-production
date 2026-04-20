
-- 1. Backfill all 859 missing stock movements for sales without audit trail
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
  0,  -- historical previous_quantity cannot be reconstructed
  0,  -- historical new_quantity cannot be reconstructed
  'Backfill: missing audit trail - Invoice ' || COALESCE(s.invoice_number, 'unknown'),
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
  );

-- 2. Create safety-net trigger function for future sales
CREATE OR REPLACE FUNCTION public.auto_record_sale_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_sale RECORD;
  v_previous_qty NUMERIC;
BEGIN
  -- Only process items with a product_id
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if a stock movement already exists for this sale+product
  IF EXISTS (
    SELECT 1 FROM stock_movements
    WHERE reference_id = NEW.sale_id
      AND reference_type = 'sale'
      AND product_id = NEW.product_id
  ) THEN
    RETURN NEW;
  END IF;

  -- Get sale details
  SELECT business_id, branch_id, invoice_number, created_by
  INTO v_sale
  FROM sales
  WHERE id = NEW.sale_id;

  IF v_sale IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get current branch stock for previous_quantity
  v_previous_qty := 0;
  IF v_sale.branch_id IS NOT NULL THEN
    SELECT COALESCE(quantity, 0) INTO v_previous_qty
    FROM branch_stock
    WHERE product_id = NEW.product_id
      AND branch_id = v_sale.branch_id;
  END IF;

  -- Insert the stock movement audit record
  INSERT INTO stock_movements (
    business_id, branch_id, product_id, movement_type,
    quantity, previous_quantity, new_quantity,
    notes, reference_type, reference_id, created_by
  ) VALUES (
    v_sale.business_id,
    v_sale.branch_id,
    NEW.product_id,
    'sale',
    NEW.quantity,
    v_previous_qty,
    GREATEST(0, v_previous_qty - NEW.quantity),
    'Sale #' || COALESCE(v_sale.invoice_number, 'unknown'),
    'sale',
    NEW.sale_id,
    v_sale.created_by
  );

  RETURN NEW;
END;
$$;

-- 3. Create the trigger on sale_items
DROP TRIGGER IF EXISTS trg_sale_item_stock_movement ON sale_items;
CREATE TRIGGER trg_sale_item_stock_movement
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_record_sale_stock_movement();
