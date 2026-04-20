
CREATE OR REPLACE FUNCTION public.atomic_decrement_stock(p_product_id uuid, p_quantity numeric, p_business_id uuid, p_branch_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_updated INTEGER;
  v_global_total NUMERIC;
BEGIN
  -- If branch_id provided, use branch_stock
  IF p_branch_id IS NOT NULL THEN
    UPDATE branch_stock
    SET quantity = quantity - p_quantity,
        updated_at = now()
    WHERE product_id = p_product_id
      AND branch_id = p_branch_id
      AND business_id = p_business_id
      AND quantity >= p_quantity;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    -- Recalculate global stock as SUM of all branches (not direct decrement)
    IF v_updated > 0 THEN
      SELECT COALESCE(SUM(quantity), 0) INTO v_global_total
      FROM branch_stock
      WHERE product_id = p_product_id
        AND business_id = p_business_id;

      UPDATE products
      SET stock_quantity = v_global_total
      WHERE id = p_product_id;
    END IF;
    
    RETURN v_updated > 0;
  ELSE
    -- Fallback: decrement global stock_quantity
    UPDATE products
    SET stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id
      AND business_id = p_business_id
      AND stock_quantity >= p_quantity;
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RETURN v_updated > 0;
  END IF;
END;
$function$;
