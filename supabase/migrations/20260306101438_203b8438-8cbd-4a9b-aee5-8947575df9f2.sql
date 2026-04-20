CREATE OR REPLACE FUNCTION public.record_stock_movement(
  p_business_id uuid,
  p_branch_id uuid,
  p_product_id uuid,
  p_movement_type text,
  p_quantity numeric,
  p_previous_quantity numeric,
  p_new_quantity numeric,
  p_notes text DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO stock_movements (
    business_id, branch_id, product_id, movement_type,
    quantity, previous_quantity, new_quantity,
    notes, reference_type, reference_id, created_by
  ) VALUES (
    p_business_id, p_branch_id, p_product_id, p_movement_type,
    p_quantity, p_previous_quantity, p_new_quantity,
    p_notes, p_reference_type, p_reference_id, auth.uid()
  );
END;
$$;