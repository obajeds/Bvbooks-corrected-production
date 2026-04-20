-- Add reward_points_value column to customers table
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS reward_points_value NUMERIC DEFAULT 0;

-- Update function to also calculate and store the Naira value of points earned
CREATE OR REPLACE FUNCTION public.update_customer_on_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_points_per_naira NUMERIC;
  v_naira_per_point NUMERIC;
  v_points_earned NUMERIC;
  v_value_earned NUMERIC;
BEGIN
  -- Only proceed if customer_id is not null
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get rewards settings for this business
  SELECT 
    is_enabled,
    points_per_naira,
    naira_per_point
  INTO 
    v_rewards_enabled,
    v_points_per_naira,
    v_naira_per_point
  FROM public.rewards_settings
  WHERE business_id = NEW.business_id
  LIMIT 1;
  
  -- Calculate points and value earned (only if rewards enabled)
  IF v_rewards_enabled = TRUE AND v_points_per_naira IS NOT NULL THEN
    v_points_earned := FLOOR(NEW.total_amount * v_points_per_naira);
    v_value_earned := v_points_earned * COALESCE(v_naira_per_point, 0.01);
  ELSE
    v_points_earned := 0;
    v_value_earned := 0;
  END IF;
  
  -- Update customer stats including reward value
  UPDATE public.customers
  SET 
    total_purchases = total_purchases + NEW.total_amount,
    total_orders = total_orders + 1,
    reward_points = COALESCE(reward_points, 0) + v_points_earned,
    reward_points_value = COALESCE(reward_points_value, 0) + v_value_earned,
    last_purchase_at = NEW.created_at,
    updated_at = now()
  WHERE id = NEW.customer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update reverse function to also deduct the Naira value
CREATE OR REPLACE FUNCTION public.reverse_customer_on_sale_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_rewards_enabled BOOLEAN;
  v_points_per_naira NUMERIC;
  v_naira_per_point NUMERIC;
  v_points_to_deduct NUMERIC;
  v_value_to_deduct NUMERIC;
BEGIN
  -- Only proceed if customer_id is not null
  IF OLD.customer_id IS NULL THEN
    RETURN OLD;
  END IF;
  
  -- Get rewards settings for this business
  SELECT 
    is_enabled,
    points_per_naira,
    naira_per_point
  INTO 
    v_rewards_enabled,
    v_points_per_naira,
    v_naira_per_point
  FROM public.rewards_settings
  WHERE business_id = OLD.business_id
  LIMIT 1;
  
  -- Calculate points and value to deduct
  IF v_rewards_enabled = TRUE AND v_points_per_naira IS NOT NULL THEN
    v_points_to_deduct := FLOOR(OLD.total_amount * v_points_per_naira);
    v_value_to_deduct := v_points_to_deduct * COALESCE(v_naira_per_point, 0.01);
  ELSE
    v_points_to_deduct := 0;
    v_value_to_deduct := 0;
  END IF;
  
  -- Reverse customer stats (don't go below 0)
  UPDATE public.customers
  SET 
    total_purchases = GREATEST(0, total_purchases - OLD.total_amount),
    total_orders = GREATEST(0, total_orders - 1),
    reward_points = GREATEST(0, COALESCE(reward_points, 0) - v_points_to_deduct),
    reward_points_value = GREATEST(0, COALESCE(reward_points_value, 0) - v_value_to_deduct),
    updated_at = now()
  WHERE id = OLD.customer_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;