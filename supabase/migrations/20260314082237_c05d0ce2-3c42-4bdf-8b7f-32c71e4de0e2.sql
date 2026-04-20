
-- Step 1: Delete duplicate stock movements for sales (keep the older one per pair)
DELETE FROM stock_movements
WHERE id IN (
  SELECT unnest(ids[1:1]) -- first element = newer duplicate (array ordered DESC)
  FROM (
    SELECT array_agg(id ORDER BY created_at DESC) as ids
    FROM stock_movements
    WHERE reference_type = 'sale'
    GROUP BY reference_id, product_id
    HAVING count(*) > 1
  ) dupes
);

-- Step 2: Add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_sale_stock_movement
ON stock_movements (reference_id, product_id)
WHERE reference_type = 'sale';

-- Step 3: Update trigger to use ON CONFLICT DO NOTHING
CREATE OR REPLACE FUNCTION public.auto_record_sale_stock_movement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sale RECORD;
  v_previous_qty NUMERIC;
BEGIN
  IF NEW.product_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT business_id, branch_id, invoice_number, created_by
  INTO v_sale
  FROM sales
  WHERE id = NEW.sale_id;

  IF v_sale IS NULL THEN
    RETURN NEW;
  END IF;

  v_previous_qty := 0;
  IF v_sale.branch_id IS NOT NULL THEN
    SELECT COALESCE(quantity, 0) INTO v_previous_qty
    FROM branch_stock
    WHERE product_id = NEW.product_id
      AND branch_id = v_sale.branch_id;
  END IF;

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
  )
  ON CONFLICT (reference_id, product_id) WHERE reference_type = 'sale'
  DO NOTHING;

  RETURN NEW;
END;
$function$;
