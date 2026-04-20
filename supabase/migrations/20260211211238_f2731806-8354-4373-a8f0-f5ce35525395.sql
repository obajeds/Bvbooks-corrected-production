
-- Fix the discount validation trigger with corrected RAISE syntax
CREATE OR REPLACE FUNCTION public.validate_sale_discount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  staff_discount_limit NUMERIC;
  discount_percent NUMERIC;
  is_owner BOOLEAN;
BEGIN
  IF COALESCE(NEW.discount_amount, 0) = 0 THEN
    RETURN NEW;
  END IF;
  
  IF NEW.discount_type = 'rewards_redemption' THEN
    RETURN NEW;
  END IF;
  
  IF NEW.subtotal > 0 THEN
    discount_percent := (NEW.discount_amount / NEW.subtotal) * 100;
  ELSE
    discount_percent := 0;
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM businesses WHERE id = NEW.business_id AND owner_user_id = auth.uid()
  ) INTO is_owner;
  
  IF is_owner THEN
    RETURN NEW;
  END IF;
  
  SELECT COALESCE(rt.discount_limit, 5) INTO staff_discount_limit
  FROM staff s
  LEFT JOIN staff_branch_assignments sba ON sba.staff_id = s.id AND sba.is_active = true
  LEFT JOIN role_templates rt ON rt.id = sba.role_template_id
  WHERE s.user_id = auth.uid()
    AND s.business_id = NEW.business_id
    AND s.is_active = true
  ORDER BY rt.discount_limit DESC NULLS LAST
  LIMIT 1;
  
  IF staff_discount_limit IS NULL THEN
    staff_discount_limit := 0;
  END IF;
  
  IF discount_percent > staff_discount_limit THEN
    RAISE EXCEPTION 'Discount exceeds your allowed limit of %', staff_discount_limit;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_discount_on_sale
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sale_discount();
