-- Add discount tracking columns to sales table
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT NULL 
  CHECK (discount_type IN ('rewards_redemption', 'company_discount', NULL)),
ADD COLUMN IF NOT EXISTS discount_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS discount_approved_by UUID REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS rewards_redeemed_value NUMERIC(10,2) DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.sales.discount_type IS 'Type of discount: rewards_redemption (customer-funded) or company_discount (business-funded)';
COMMENT ON COLUMN public.sales.discount_reason IS 'Required reason for company discounts';
COMMENT ON COLUMN public.sales.discount_approved_by IS 'User who approved the company discount';
COMMENT ON COLUMN public.sales.rewards_redeemed_value IS 'Naira value deducted from customer rewards vault';

-- Create index for reporting
CREATE INDEX IF NOT EXISTS idx_sales_discount_type ON public.sales(discount_type) WHERE discount_type IS NOT NULL;

-- Create function to deduct rewards from customer vault
CREATE OR REPLACE FUNCTION public.deduct_customer_rewards(
  p_customer_id UUID,
  p_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_value NUMERIC;
  v_current_points INTEGER;
  v_naira_per_point NUMERIC;
  v_points_to_deduct INTEGER;
BEGIN
  -- Get current reward values
  SELECT reward_points_value, reward_points 
  INTO v_current_value, v_current_points
  FROM customers 
  WHERE id = p_customer_id;
  
  -- Validate sufficient balance
  IF v_current_value IS NULL OR v_current_value < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate points to deduct (proportional to value)
  IF v_current_value > 0 THEN
    v_points_to_deduct := FLOOR((p_amount / v_current_value) * v_current_points);
  ELSE
    v_points_to_deduct := 0;
  END IF;
  
  -- Update customer vault
  UPDATE customers
  SET 
    reward_points = GREATEST(0, COALESCE(reward_points, 0) - v_points_to_deduct),
    reward_points_value = GREATEST(0, COALESCE(reward_points_value, 0) - p_amount),
    updated_at = NOW()
  WHERE id = p_customer_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.deduct_customer_rewards(UUID, NUMERIC) TO authenticated;