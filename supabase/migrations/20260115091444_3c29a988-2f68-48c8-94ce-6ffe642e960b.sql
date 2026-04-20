-- =====================================================
-- ADD RLS POLICIES FOR PUMPS TABLE
-- Uses existing SECURITY DEFINER functions to prevent recursion
-- =====================================================

-- Policy for owners to manage pumps (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Business owners can manage pumps"
ON public.pumps
FOR ALL
USING (business_id = public.get_owned_business_id())
WITH CHECK (business_id = public.get_owned_business_id());

-- Policy for staff to view pumps in their business
CREATE POLICY "Staff can view pumps"
ON public.pumps
FOR SELECT
USING (business_id = public.get_staff_business_id());

-- Policy for staff with gas.pumps.manage permission to manage pumps
CREATE POLICY "Staff with permission can manage pumps"
ON public.pumps
FOR ALL
USING (
  business_id = public.get_staff_business_id() 
  AND public.has_permission(auth.uid(), 'gas.pumps.manage'::permission_key)
)
WITH CHECK (
  business_id = public.get_staff_business_id()
  AND public.has_permission(auth.uid(), 'gas.pumps.manage'::permission_key)
);