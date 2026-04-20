-- =====================================================
-- ADD INSERT POLICIES FOR SALES TABLE
-- Uses existing SECURITY DEFINER functions to prevent recursion
-- =====================================================

-- Policy for business owners to create sales
CREATE POLICY "Business owners can create sales"
ON public.sales
FOR INSERT
WITH CHECK (business_id = public.get_owned_business_id());

-- Policy for staff to create sales (they need pos.sale.create or general sales access)
CREATE POLICY "Staff can create sales"
ON public.sales
FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- Also add INSERT policy for sale_items for owners
CREATE POLICY "Business owners can insert sale items"
ON public.sale_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales sa
    WHERE sa.id = sale_items.sale_id 
    AND sa.business_id = public.get_owned_business_id()
  )
);