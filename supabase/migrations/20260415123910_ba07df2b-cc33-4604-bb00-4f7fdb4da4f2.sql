-- Performance indexes: additive only, no schema changes

CREATE INDEX IF NOT EXISTS idx_sales_created_by
  ON public.sales (created_by);

CREATE INDEX IF NOT EXISTS idx_sales_biz_branch_created
  ON public.sales (business_id, branch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expenses_biz_branch_date
  ON public.expenses (business_id, branch_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_stock_movements_biz_type
  ON public.stock_movements (business_id, movement_type);