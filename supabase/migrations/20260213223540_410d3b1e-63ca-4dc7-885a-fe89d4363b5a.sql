
-- ============================================================
-- BRANCH-LEVEL DATA ISOLATION FOR STAFF
-- Owner: sees ALL branches. Staff: sees ONLY assigned branches.
-- Uses existing can_access_branch_for_rls() which checks owner OR staff_branch_assignments.
-- ============================================================

-- ======================== EXPENSES ========================
DROP POLICY IF EXISTS "Business staff can view their expenses" ON public.expenses;
DROP POLICY IF EXISTS "Expense access control" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_secure" ON public.expenses;

CREATE POLICY "Staff can view expenses in assigned branches"
ON public.expenses FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'expenses.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== STOCK MOVEMENTS ========================
DROP POLICY IF EXISTS "Staff can view stock movements" ON public.stock_movements;
DROP POLICY IF EXISTS "stock_movements_select_secure" ON public.stock_movements;
DROP POLICY IF EXISTS "Stock movement access control" ON public.stock_movements;

CREATE POLICY "Staff can view stock_movements in assigned branches"
ON public.stock_movements FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'inventory.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== SETTLEMENTS ========================
DROP POLICY IF EXISTS "Settlement access control" ON public.settlements;
DROP POLICY IF EXISTS "settlements_select_secure" ON public.settlements;
DROP POLICY IF EXISTS "Users can view their business settlements" ON public.settlements;
DROP POLICY IF EXISTS "Business staff can view their settlements" ON public.settlements;

CREATE POLICY "Staff can view settlements in assigned branches"
ON public.settlements FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'accounting.settlements.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== RECONCILIATIONS ========================
DROP POLICY IF EXISTS "Reconciliation access control" ON public.reconciliations;
DROP POLICY IF EXISTS "Users can view their business reconciliations" ON public.reconciliations;
DROP POLICY IF EXISTS "Super admins can view all reconciliations" ON public.reconciliations;

CREATE POLICY "Staff can view reconciliations in assigned branches"
ON public.reconciliations FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'accounting.reconciliations.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== PURCHASE ORDERS ========================
DROP POLICY IF EXISTS "Purchase order access control" ON public.purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_select_secure" ON public.purchase_orders;
DROP POLICY IF EXISTS "Staff can view purchase_orders" ON public.purchase_orders;

CREATE POLICY "Staff can view purchase_orders in assigned branches"
ON public.purchase_orders FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'inventory.view'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== DAILY PUMP SALES ========================
DROP POLICY IF EXISTS "Pump sales access control" ON public.daily_pump_sales;
DROP POLICY IF EXISTS "daily_pump_sales_select_secure" ON public.daily_pump_sales;
DROP POLICY IF EXISTS "Staff can view daily_pump_sales" ON public.daily_pump_sales;

CREATE POLICY "Staff can view daily_pump_sales in assigned branches"
ON public.daily_pump_sales FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
    AND has_permission(auth.uid(), 'gas.sales.entry'::permission_key)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== PUMPS ========================
DROP POLICY IF EXISTS "Staff can view pumps" ON public.pumps;

CREATE POLICY "Staff can view pumps in assigned branches"
ON public.pumps FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== ACTIVE DISCOUNTS ========================
DROP POLICY IF EXISTS "Staff can view active discounts" ON public.active_discounts;
DROP POLICY IF EXISTS "active_discounts_select_secure" ON public.active_discounts;

CREATE POLICY "Staff can view active_discounts in assigned branches"
ON public.active_discounts FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== AFTER HOURS ALERTS ========================
DROP POLICY IF EXISTS "Staff can view after_hours_alerts" ON public.after_hours_alerts;
DROP POLICY IF EXISTS "after_hours_alerts_select_secure" ON public.after_hours_alerts;

CREATE POLICY "Staff can view after_hours_alerts in assigned branches"
ON public.after_hours_alerts FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
  )
  OR is_super_admin_domain(auth.uid())
);

-- ======================== BRANCH PRODUCT PRICES ========================
DROP POLICY IF EXISTS "Staff can view branch prices" ON public.branch_product_prices;

CREATE POLICY "Staff can view branch_product_prices in assigned branches"
ON public.branch_product_prices FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR can_access_branch_for_rls(auth.uid(), branch_id)
  OR is_super_admin_domain(auth.uid())
);

-- ======================== BUSINESS HOURS ========================
DROP POLICY IF EXISTS "Staff can view business hours" ON public.business_hours;

CREATE POLICY "Staff can view business_hours in assigned branches"
ON public.business_hours FOR SELECT TO authenticated
USING (
  is_business_owner(business_id)
  OR (
    branch_id IS NULL -- Global hours visible to all staff in business
    AND EXISTS (SELECT 1 FROM staff s WHERE s.business_id = business_hours.business_id AND s.user_id = auth.uid() AND s.is_active = true)
  )
  OR (
    branch_id IS NOT NULL 
    AND can_access_branch_for_rls(auth.uid(), branch_id)
  )
  OR is_super_admin_domain(auth.uid())
);
