-- =====================================================
-- COMPREHENSIVE RLS POLICY FIX FOR ALL TABLES WITHOUT POLICIES
-- Uses SECURITY DEFINER functions to prevent recursion
-- =====================================================

-- 1. AFTER_HOURS_ALERTS - Business owners and staff can view alerts for their business
CREATE POLICY "Business owners can manage after_hours_alerts"
ON public.after_hours_alerts FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view after_hours_alerts"
ON public.after_hours_alerts FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 2. ATTENDANCE - Business owners and staff can manage attendance
CREATE POLICY "Business owners can manage attendance"
ON public.attendance FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view attendance"
ON public.attendance FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert own attendance"
ON public.attendance FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- 3. BRANCH_ACCESS_LOGS - Business owners can view, staff can insert
CREATE POLICY "Business owners can manage branch_access_logs"
ON public.branch_access_logs FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can insert branch_access_logs"
ON public.branch_access_logs FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can view own branch_access_logs"
ON public.branch_access_logs FOR SELECT
USING (business_id = public.get_staff_business_id() AND user_id = auth.uid());

-- 4. BUSINESS_NOTIFICATIONS - Business users can manage their notifications
CREATE POLICY "Business owners can manage business_notifications"
ON public.business_notifications FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view business_notifications"
ON public.business_notifications FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 5. CUSTOM_ROLES - Business owners can manage custom roles
CREATE POLICY "Business owners can manage custom_roles"
ON public.custom_roles FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view custom_roles"
ON public.custom_roles FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 6. CUSTOMER_GROUPS - Business users can manage customer groups
CREATE POLICY "Business owners can manage customer_groups"
ON public.customer_groups FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view customer_groups"
ON public.customer_groups FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage customer_groups"
ON public.customer_groups FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 7. DAILY_PUMP_SALES - Gas module sales
CREATE POLICY "Business owners can manage daily_pump_sales"
ON public.daily_pump_sales FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view daily_pump_sales"
ON public.daily_pump_sales FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert daily_pump_sales"
ON public.daily_pump_sales FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can update own daily_pump_sales"
ON public.daily_pump_sales FOR UPDATE
USING (business_id = public.get_staff_business_id());

-- 8. DAILY_SYNC_STATUS - Sync status tracking
CREATE POLICY "Business owners can manage daily_sync_status"
ON public.daily_sync_status FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view daily_sync_status"
ON public.daily_sync_status FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage daily_sync_status"
ON public.daily_sync_status FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 9. DAY_LOCKS - Day locking for accounting
CREATE POLICY "Business owners can manage day_locks"
ON public.day_locks FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view day_locks"
ON public.day_locks FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 10. EXPENSE_CATEGORIES - Expense categorization
CREATE POLICY "Business owners can manage expense_categories"
ON public.expense_categories FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view expense_categories"
ON public.expense_categories FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage expense_categories"
ON public.expense_categories FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 11. LEAVE_REQUESTS - HRM leave management
CREATE POLICY "Business owners can manage leave_requests"
ON public.leave_requests FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view leave_requests"
ON public.leave_requests FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert leave_requests"
ON public.leave_requests FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- 12. LOW_STOCK_ALERT_STATES - Inventory alerts
CREATE POLICY "Business owners can manage low_stock_alert_states"
ON public.low_stock_alert_states FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view low_stock_alert_states"
ON public.low_stock_alert_states FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage low_stock_alert_states"
ON public.low_stock_alert_states FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 13. PERMISSION_AUDIT_LOGS - Only owners can view permission audit logs
CREATE POLICY "Business owners can view permission_audit_logs"
ON public.permission_audit_logs FOR SELECT
USING (business_id = public.get_owned_business_id());

CREATE POLICY "System can insert permission_audit_logs"
ON public.permission_audit_logs FOR INSERT
WITH CHECK (business_id = public.get_owned_business_id() OR business_id = public.get_staff_business_id());

-- 14. PURCHASE_ORDER_ITEMS - Purchase order line items
CREATE POLICY "Business owners can manage purchase_order_items"
ON public.purchase_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.purchase_order_id 
  AND po.business_id = public.get_owned_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.purchase_order_id 
  AND po.business_id = public.get_owned_business_id()
));

CREATE POLICY "Staff can view purchase_order_items"
ON public.purchase_order_items FOR SELECT
USING (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.purchase_order_id 
  AND po.business_id = public.get_staff_business_id()
));

CREATE POLICY "Staff can manage purchase_order_items"
ON public.purchase_order_items FOR ALL
USING (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.purchase_order_id 
  AND po.business_id = public.get_staff_business_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM purchase_orders po 
  WHERE po.id = purchase_order_items.purchase_order_id 
  AND po.business_id = public.get_staff_business_id()
));

-- 15. PURCHASE_ORDERS - Purchase order management
CREATE POLICY "Business owners can manage purchase_orders"
ON public.purchase_orders FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view purchase_orders"
ON public.purchase_orders FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage purchase_orders"
ON public.purchase_orders FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 16. REWARDS_SETTINGS - CRM rewards configuration
CREATE POLICY "Business owners can manage rewards_settings"
ON public.rewards_settings FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view rewards_settings"
ON public.rewards_settings FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 17. SALES_LEDGER - Sales ledger entries
CREATE POLICY "Business owners can manage sales_ledger"
ON public.sales_ledger FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view sales_ledger"
ON public.sales_ledger FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert sales_ledger"
ON public.sales_ledger FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- 18. STAFF_INVITATIONS - Staff invitation management
CREATE POLICY "Business owners can manage staff_invitations"
ON public.staff_invitations FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Invited users can view their invitations"
ON public.staff_invitations FOR SELECT
USING (email = auth.jwt()->>'email');

-- 19. STAFF_RISK_SCORES - Staff risk assessment
CREATE POLICY "Business owners can manage staff_risk_scores"
ON public.staff_risk_scores FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view own risk_scores"
ON public.staff_risk_scores FOR SELECT
USING (business_id = public.get_staff_business_id());

-- 20. STOCK_MOVEMENTS - Inventory stock movements
CREATE POLICY "Business owners can manage stock_movements"
ON public.stock_movements FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view stock_movements"
ON public.stock_movements FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert stock_movements"
ON public.stock_movements FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- 21. SUPPLIERS - Supplier management
CREATE POLICY "Business owners can manage suppliers"
ON public.suppliers FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view suppliers"
ON public.suppliers FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can manage suppliers"
ON public.suppliers FOR ALL
USING (business_id = public.get_staff_business_id())
WITH CHECK (business_id = public.get_staff_business_id());

-- 22. SYNC_LOGS - Sync logging
CREATE POLICY "Business owners can manage sync_logs"
ON public.sync_logs FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

CREATE POLICY "Staff can view sync_logs"
ON public.sync_logs FOR SELECT
USING (business_id = public.get_staff_business_id());

CREATE POLICY "Staff can insert sync_logs"
ON public.sync_logs FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- 23. USER_NOTIFICATION_PREFERENCES - User notification settings
CREATE POLICY "Users can manage own notification_preferences"
ON public.user_notification_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());