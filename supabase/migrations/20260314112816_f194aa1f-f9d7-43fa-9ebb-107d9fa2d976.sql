
-- Fix search_path on validation functions
CREATE OR REPLACE FUNCTION public.validate_reconciliation_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid reconciliation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_reconciliation_item_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'counted', 'applied', 'skipped') THEN
    RAISE EXCEPTION 'Invalid reconciliation item status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;
