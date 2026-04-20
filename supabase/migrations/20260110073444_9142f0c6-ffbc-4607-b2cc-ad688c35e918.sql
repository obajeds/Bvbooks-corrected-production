-- Fix: Change the view to use invoker security (default) instead of definer
DROP VIEW IF EXISTS public.daily_sales_summary;

CREATE VIEW public.daily_sales_summary 
WITH (security_invoker = true) AS
SELECT 
  dps.business_id,
  dps.branch_id,
  dps.sale_date,
  COUNT(DISTINCT dps.staff_id) as cashier_count,
  COUNT(dps.id) as entry_count,
  SUM(dps.liters_sold) as total_liters,
  SUM(dps.expected_revenue) as total_expected,
  SUM(dps.cash_collected) as total_cash,
  SUM(dps.pos_collected) as total_pos,
  SUM(dps.transfer_collected) as total_transfer,
  SUM(dps.total_collected) as grand_total,
  SUM(dps.variance) as total_variance,
  COUNT(CASE WHEN dps.status = 'submitted' THEN 1 END) as submitted_count,
  COUNT(CASE WHEN dps.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN dps.variance < 0 THEN 1 END) as shortage_count
FROM public.daily_pump_sales dps
GROUP BY dps.business_id, dps.branch_id, dps.sale_date;

-- Fix: Replace overly permissive policy with proper business owner check
DROP POLICY IF EXISTS "Owners can manage pumps" ON public.pumps;

CREATE POLICY "Owners can insert pumps"
ON public.pumps FOR INSERT
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Owners can update pumps"
ON public.pumps FOR UPDATE
USING (is_business_owner(business_id));

CREATE POLICY "Owners can delete pumps"
ON public.pumps FOR DELETE
USING (is_business_owner(business_id));