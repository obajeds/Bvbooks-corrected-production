-- Fix the calculate_reconciliation function that incorrectly uses MIN() on UUID
-- PostgreSQL does not support MIN() on UUID type directly

CREATE OR REPLACE FUNCTION public.calculate_reconciliation(
  _business_id UUID,
  _cashier_id UUID,
  _payment_type TEXT,
  _sale_date DATE
) RETURNS public.reconciliation_status
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _expected NUMERIC(12,2);
  _actual NUMERIC(12,2);
  _diff NUMERIC(12,2);
  _status public.reconciliation_status;
  _branch_id UUID;
BEGIN
  -- Get expected from sales
  -- Use a subquery to get branch_id separately since MIN(uuid) is not supported
  SELECT COALESCE(SUM(total_amount), 0)
  INTO _expected
  FROM sales
  WHERE business_id = _business_id
    AND created_by = _cashier_id
    AND payment_method = _payment_type
    AND DATE(created_at) = _sale_date;

  -- Get branch_id from the first matching sale (using ORDER BY and LIMIT instead of MIN)
  SELECT branch_id
  INTO _branch_id
  FROM sales
  WHERE business_id = _business_id
    AND created_by = _cashier_id
    AND payment_method = _payment_type
    AND DATE(created_at) = _sale_date
  ORDER BY created_at ASC
  LIMIT 1;

  -- Get actual from settlements
  SELECT COALESCE(SUM(amount), 0)
  INTO _actual
  FROM settlements
  WHERE business_id = _business_id
    AND cashier_id = _cashier_id
    AND payment_type = _payment_type
    AND settlement_date = _sale_date;

  -- Calculate difference (actual - expected)
  _diff := _actual - _expected;

  -- Determine status
  IF _actual = 0 AND _expected = 0 THEN
    _status := 'balanced';
  ELSIF _diff = 0 THEN
    _status := 'balanced';
  ELSIF _diff > 0 THEN
    _status := 'excess';
  ELSE
    _status := 'shortage';
  END IF;

  -- Upsert reconciliation record
  INSERT INTO reconciliations (
    business_id, branch_id, cashier_id, payment_type,
    sale_date, expected_amount, actual_amount, difference, status
  ) VALUES (
    _business_id, _branch_id, _cashier_id, _payment_type,
    _sale_date, _expected, _actual, _diff, _status
  )
  ON CONFLICT (business_id, cashier_id, payment_type, sale_date)
  DO UPDATE SET
    expected_amount = _expected,
    actual_amount = _actual,
    difference = _diff,
    status = _status,
    updated_at = now();

  RETURN _status;
END;
$$;