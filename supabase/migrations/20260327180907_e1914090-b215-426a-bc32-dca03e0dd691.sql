CREATE OR REPLACE FUNCTION public.create_sale_atomic(
  p_business_id UUID,
  p_branch_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_subtotal NUMERIC DEFAULT 0,
  p_discount_amount NUMERIC DEFAULT 0,
  p_tax_amount NUMERIC DEFAULT 0,
  p_total_amount NUMERIC DEFAULT 0,
  p_payment_method TEXT DEFAULT 'cash',
  p_payment_status TEXT DEFAULT 'completed',
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL,
  p_discount_type TEXT DEFAULT NULL,
  p_discount_reason TEXT DEFAULT NULL,
  p_discount_approved_by TEXT DEFAULT NULL,
  p_rewards_redeemed_value NUMERIC DEFAULT 0,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id UUID;
  v_invoice_number TEXT;
  v_item JSONB;
  v_product_id UUID;
  v_quantity NUMERIC;
  v_branch_stock_qty NUMERIC;
  v_product_stock_qty NUMERIC;
  v_available NUMERIC;
  v_product_name TEXT;
  v_new_qty NUMERIC;
  v_items_array JSONB := '[]'::jsonb;
  v_discount_approved_by UUID;
BEGIN
  -- Cast discount_approved_by from TEXT to UUID safely
  IF p_discount_approved_by IS NOT NULL AND p_discount_approved_by <> '' THEN
    BEGIN
      v_discount_approved_by := p_discount_approved_by::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_discount_approved_by := NULL;
    END;
  ELSE
    v_discount_approved_by := NULL;
  END IF;

  -- Step 1: Generate invoice number
  BEGIN
    SELECT public.generate_invoice_number(p_business_id) INTO v_invoice_number;
  EXCEPTION WHEN OTHERS THEN
    v_invoice_number := 'INV-' || upper(substr(gen_random_uuid()::text, 1, 8));
  END;

  -- Step 2: Lock and validate stock for ALL items before any mutations
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::NUMERIC;
    v_product_name := v_item->>'product_name';

    IF v_product_id IS NULL THEN
      CONTINUE;
    END IF;

    IF p_branch_id IS NOT NULL THEN
      SELECT bs.quantity INTO v_branch_stock_qty
      FROM branch_stock bs
      WHERE bs.product_id = v_product_id
        AND bs.branch_id = p_branch_id
        AND bs.business_id = p_business_id
      FOR UPDATE;

      IF v_branch_stock_qty IS NULL THEN
        RAISE EXCEPTION 'Insufficient stock for "%". Available: 0, Requested: %', v_product_name, v_quantity;
      END IF;

      v_available := v_branch_stock_qty;
    ELSE
      SELECT p.stock_quantity INTO v_product_stock_qty
      FROM products p
      WHERE p.id = v_product_id
        AND p.business_id = p_business_id
      FOR UPDATE;

      IF v_product_stock_qty IS NULL THEN
        RAISE EXCEPTION 'Product "%" not found', v_product_name;
      END IF;

      v_available := v_product_stock_qty;
    END IF;

    IF v_quantity > v_available THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %, Requested: %', v_product_name, v_available, v_quantity;
    END IF;
  END LOOP;

  -- Step 3: Create the sale record
  INSERT INTO sales (
    business_id, branch_id, customer_id, invoice_number,
    subtotal, discount_amount, tax_amount, total_amount,
    payment_method, payment_status, notes, created_by,
    discount_type, discount_reason, discount_approved_by, rewards_redeemed_value
  ) VALUES (
    p_business_id, p_branch_id, p_customer_id, v_invoice_number,
    p_subtotal, COALESCE(p_discount_amount, 0), COALESCE(p_tax_amount, 0), p_total_amount,
    p_payment_method, COALESCE(p_payment_status, 'completed'), p_notes, p_created_by,
    p_discount_type, p_discount_reason, v_discount_approved_by, COALESCE(p_rewards_redeemed_value, 0)
  )
  RETURNING id INTO v_sale_id;

  -- Step 4: Insert sale items and deduct stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::NUMERIC;
    v_product_name := v_item->>'product_name';

    INSERT INTO sale_items (
      sale_id, product_id, product_name, quantity,
      unit_price, total_price, cost_price, discount
    ) VALUES (
      v_sale_id,
      v_product_id,
      v_product_name,
      v_quantity,
      (v_item->>'unit_price')::NUMERIC,
      (v_item->>'total_price')::NUMERIC,
      COALESCE((v_item->>'cost_price')::NUMERIC, 0),
      COALESCE((v_item->>'discount')::NUMERIC, 0)
    );

    IF v_product_id IS NOT NULL THEN
      IF p_branch_id IS NOT NULL THEN
        UPDATE branch_stock
        SET quantity = quantity - v_quantity,
            updated_at = now()
        WHERE product_id = v_product_id
          AND branch_id = p_branch_id
          AND business_id = p_business_id;

        SELECT COALESCE(SUM(bs.quantity), 0) INTO v_new_qty
        FROM branch_stock bs
        WHERE bs.product_id = v_product_id
          AND bs.business_id = p_business_id;

        UPDATE products
        SET stock_quantity = v_new_qty
        WHERE id = v_product_id;
      ELSE
        UPDATE products
        SET stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id
          AND business_id = p_business_id;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'id', v_sale_id,
    'invoice_number', v_invoice_number,
    'success', true
  );
END;
$$;