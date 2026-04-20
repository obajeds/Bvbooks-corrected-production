
-- Step 1: Create branch_stock table
CREATE TABLE public.branch_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(branch_id, product_id)
);

-- Indexes
CREATE INDEX idx_branch_stock_business ON public.branch_stock(business_id);
CREATE INDEX idx_branch_stock_branch ON public.branch_stock(branch_id);
CREATE INDEX idx_branch_stock_product ON public.branch_stock(product_id);
CREATE INDEX idx_branch_stock_low ON public.branch_stock(business_id, branch_id) WHERE quantity <= low_stock_threshold;

-- Updated_at trigger
CREATE TRIGGER update_branch_stock_updated_at
  BEFORE UPDATE ON public.branch_stock
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.branch_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view branch stock for accessible branches"
  ON public.branch_stock FOR SELECT
  USING (can_access_branch_for_rls(auth.uid(), branch_id));

CREATE POLICY "Users can insert branch stock for accessible branches"
  ON public.branch_stock FOR INSERT
  WITH CHECK (can_access_branch_for_rls(auth.uid(), branch_id));

CREATE POLICY "Users can update branch stock for accessible branches"
  ON public.branch_stock FOR UPDATE
  USING (can_access_branch_for_rls(auth.uid(), branch_id));

CREATE POLICY "Users can delete branch stock for accessible branches"
  ON public.branch_stock FOR DELETE
  USING (can_access_branch_for_rls(auth.uid(), branch_id));

-- Step 2: Create atomic_decrement_stock function (branch-aware)
CREATE OR REPLACE FUNCTION public.atomic_decrement_stock(
  p_product_id UUID,
  p_quantity NUMERIC,
  p_business_id UUID,
  p_branch_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current NUMERIC;
  v_updated INTEGER;
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
    
    -- Also update global products.stock_quantity for backward compat
    IF v_updated > 0 THEN
      UPDATE products
      SET stock_quantity = GREATEST(stock_quantity - p_quantity, 0)
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
$$;

-- Step 3: Seed existing stock data into branch_stock for main branches
INSERT INTO public.branch_stock (business_id, branch_id, product_id, quantity, low_stock_threshold)
SELECT 
  p.business_id,
  b.id AS branch_id,
  p.id AS product_id,
  COALESCE(p.stock_quantity, 0) AS quantity,
  COALESCE(p.low_stock_threshold, 5) AS low_stock_threshold
FROM public.products p
INNER JOIN public.branches b ON b.business_id = p.business_id AND b.is_main = true
ON CONFLICT (branch_id, product_id) DO NOTHING;
