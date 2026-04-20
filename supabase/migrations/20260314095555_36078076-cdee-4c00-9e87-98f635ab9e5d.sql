
DO $$
DECLARE
  rec RECORD;
  cat_prefix TEXT;
  name_prefix TEXT;
  base_sku TEXT;
  new_sku TEXT;
  seq INT;
  existing_skus TEXT[];
  barcode_val TEXT;
  barcode_exists BOOLEAN;
BEGIN
  FOR rec IN
    SELECT p.id, p.name, p.sku, p.business_id, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.business_id, p.created_at ASC
  LOOP
    cat_prefix := UPPER(LEFT(REGEXP_REPLACE(COALESCE(rec.category_name, 'GEN'), '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(cat_prefix) < 3 THEN
      cat_prefix := RPAD(cat_prefix, 3, 'X');
    END IF;

    name_prefix := UPPER(LEFT(REGEXP_REPLACE(rec.name, '[^A-Za-z]', '', 'g'), 3));
    IF LENGTH(name_prefix) < 3 THEN
      name_prefix := RPAD(name_prefix, 3, 'X');
    END IF;

    base_sku := cat_prefix || '-' || name_prefix;

    IF rec.sku IS NOT NULL AND rec.sku LIKE base_sku || '-%' THEN
      CONTINUE;
    END IF;

    SELECT ARRAY_AGG(p2.sku) INTO existing_skus
    FROM products p2
    WHERE p2.business_id = rec.business_id
      AND p2.sku LIKE base_sku || '-%'
      AND p2.id != rec.id;

    IF existing_skus IS NULL THEN
      existing_skus := ARRAY[]::TEXT[];
    END IF;

    seq := 1;
    LOOP
      new_sku := base_sku || '-' || LPAD(seq::TEXT, 3, '0');
      EXIT WHEN NOT (new_sku = ANY(existing_skus));
      seq := seq + 1;
    END LOOP;

    UPDATE products SET sku = new_sku WHERE id = rec.id;

    -- Deactivate old system-generated barcodes first
    UPDATE barcodes
    SET is_active = false
    WHERE product_id = rec.id
      AND source = 'system_generated'
      AND is_active = true;

    -- Check if barcode value already exists for this business
    barcode_val := REGEXP_REPLACE(new_sku, '[^A-Z0-9]', '', 'g');
    SELECT EXISTS(
      SELECT 1 FROM barcodes
      WHERE business_id = rec.business_id
        AND barcode_value = barcode_val
        AND is_active = true
    ) INTO barcode_exists;

    IF NOT barcode_exists THEN
      INSERT INTO barcodes (product_id, business_id, barcode_value, barcode_type, source, is_active)
      VALUES (rec.id, rec.business_id, barcode_val, 'Code128', 'system_generated', true);
    END IF;

  END LOOP;
END $$;
