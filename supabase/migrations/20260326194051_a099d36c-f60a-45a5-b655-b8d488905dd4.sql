CREATE INDEX IF NOT EXISTS idx_sales_business_branch_created ON public.sales (business_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_business_created ON public.sales (business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON public.sales (customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items (product_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products (business_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_business_branch_created ON public.stock_movements (business_id, branch_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_created ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_stock_business_branch ON public.branch_stock (business_id, branch_id);