-- Create function to update customer stats and reward points on sale
CREATE OR REPLACE FUNCTION public.update_customer_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_points_per_naira NUMERIC;
  v_points_earned NUMERIC;
BEGIN
  -- Only proceed if customer_id is not null
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get rewards settings for this business
  SELECT 
    is_enabled,
    points_per_naira
  INTO 
    v_rewards_enabled,
    v_points_per_naira
  FROM public.rewards_settings
  WHERE business_id = NEW.business_id
  LIMIT 1;
  
  -- Calculate points earned (only if rewards enabled)
  IF v_rewards_enabled = TRUE AND v_points_per_naira IS NOT NULL THEN
    v_points_earned := FLOOR(NEW.total_amount * v_points_per_naira);
  ELSE
    v_points_earned := 0;
  END IF;
  
  -- Update customer stats
  UPDATE public.customers
  SET 
    total_purchases = total_purchases + NEW.total_amount,
    total_orders = total_orders + 1,
    reward_points = COALESCE(reward_points, 0) + v_points_earned,
    last_purchase_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on sales table for INSERT
DROP TRIGGER IF EXISTS trigger_update_customer_on_sale ON public.sales;
CREATE TRIGGER trigger_update_customer_on_sale
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_sale();

-- Create function to reverse customer stats on sale deletion/refund
CREATE OR REPLACE FUNCTION public.reverse_customer_on_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_points_per_naira NUMERIC;
  v_points_to_deduct NUMERIC;
BEGIN
  -- Only proceed if customer_id is not null
  IF OLD.customer_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get rewards settings for this business
  SELECT 
    is_enabled,
    points_per_naira
  INTO 
    v_rewards_enabled,
    v_points_per_naira
  FROM public.rewards_settings
  WHERE business_id = OLD.business_id
  LIMIT 1;
  
  -- Calculate points to deduct
  IF v_rewards_enabled = TRUE AND v_points_per_naira IS NOT NULL THEN
    v_points_to_deduct := FLOOR(OLD.total_amount * v_points_per_naira);
  ELSE
    v_points_to_deduct := 0;
  END IF;
  
  -- Reverse customer stats (don't go below 0)
  UPDATE public.customers
  SET 
    total_purchases = GREATEST(0, total_purchases - OLD.total_amount),
    total_orders = GREATEST(0, total_orders - 1),
    reward_points = GREATEST(0, COALESCE(reward_points, 0) - v_points_to_deduct),
    updated_at = now()
  WHERE id = OLD.customer_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on sales table for DELETE
DROP TRIGGER IF EXISTS trigger_reverse_customer_on_sale_delete ON public.sales;
CREATE TRIGGER trigger_reverse_customer_on_sale_delete
  BEFORE DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_customer_on_sale_delete();