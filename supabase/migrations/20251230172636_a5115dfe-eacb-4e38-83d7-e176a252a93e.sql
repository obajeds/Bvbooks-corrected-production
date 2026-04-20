-- Performance indexes for faster dashboard and sales queries
-- These are critical for fast dashboard loading

-- Index on sales.created_at for time-based queries (today's sales, recent sales, etc.)
CREATE INDEX IF NOT EXISTS idx_sales_created_at_desc ON public.sales (created_at DESC);

-- Index on sales.business_id for filtering by business
CREATE INDEX IF NOT EXISTS idx_sales_business_id ON public.sales (business_id);

-- Composite index for the most common dashboard query pattern
CREATE INDEX IF NOT EXISTS idx_sales_business_created ON public.sales (business_id, created_at DESC);

-- Index on products for inventory health queries
CREATE INDEX IF NOT EXISTS idx_products_business_active ON public.products (business_id, is_active);

-- Index on sale_items for top selling product queries
CREATE INDEX IF NOT EXISTS idx_sale_items_product_name ON public.sale_items (product_name);

-- Index on staff for team activity queries
CREATE INDEX IF NOT EXISTS idx_staff_business_active ON public.staff (business_id, is_active);

-- Index on expenses for expense queries by date
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses (business_id, expense_date DESC);