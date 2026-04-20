
-- Stock Reconciliation tables
CREATE TABLE public.stock_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  started_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  total_items INT DEFAULT 0,
  items_counted INT DEFAULT 0,
  items_with_variance INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Validation trigger instead of CHECK constraint for status
CREATE OR REPLACE FUNCTION validate_reconciliation_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('in_progress', 'completed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid reconciliation status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_reconciliation_status
  BEFORE INSERT OR UPDATE ON public.stock_reconciliations
  FOR EACH ROW EXECUTE FUNCTION validate_reconciliation_status();

CREATE TABLE public.stock_reconciliation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES stock_reconciliations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  system_quantity NUMERIC NOT NULL,
  physical_quantity NUMERIC,
  variance NUMERIC GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  applied_at TIMESTAMPTZ,
  applied_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (reconciliation_id, product_id)
);

-- Validation trigger for item status
CREATE OR REPLACE FUNCTION validate_reconciliation_item_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'counted', 'applied', 'skipped') THEN
    RAISE EXCEPTION 'Invalid reconciliation item status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_reconciliation_item_status
  BEFORE INSERT OR UPDATE ON public.stock_reconciliation_items
  FOR EACH ROW EXECUTE FUNCTION validate_reconciliation_item_status();

-- RLS for stock_reconciliations
ALTER TABLE public.stock_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reconciliations for their branch"
  ON public.stock_reconciliations FOR SELECT TO authenticated
  USING (can_access_branch_for_rls(auth.uid(), branch_id));

CREATE POLICY "Users can create reconciliations for their branch"
  ON public.stock_reconciliations FOR INSERT TO authenticated
  WITH CHECK (can_access_branch_for_rls(auth.uid(), branch_id));

CREATE POLICY "Users can update reconciliations for their branch"
  ON public.stock_reconciliations FOR UPDATE TO authenticated
  USING (can_access_branch_for_rls(auth.uid(), branch_id));

-- RLS for stock_reconciliation_items
ALTER TABLE public.stock_reconciliation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reconciliation items via session"
  ON public.stock_reconciliation_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stock_reconciliations sr
    WHERE sr.id = reconciliation_id
    AND can_access_branch_for_rls(auth.uid(), sr.branch_id)
  ));

CREATE POLICY "Users can insert reconciliation items via session"
  ON public.stock_reconciliation_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM stock_reconciliations sr
    WHERE sr.id = reconciliation_id
    AND can_access_branch_for_rls(auth.uid(), sr.branch_id)
  ));

CREATE POLICY "Users can update reconciliation items via session"
  ON public.stock_reconciliation_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM stock_reconciliations sr
    WHERE sr.id = reconciliation_id
    AND can_access_branch_for_rls(auth.uid(), sr.branch_id)
  ));

-- Indexes
CREATE INDEX idx_stock_reconciliations_business ON stock_reconciliations(business_id);
CREATE INDEX idx_stock_reconciliations_branch ON stock_reconciliations(branch_id);
CREATE INDEX idx_stock_reconciliation_items_recon ON stock_reconciliation_items(reconciliation_id);
