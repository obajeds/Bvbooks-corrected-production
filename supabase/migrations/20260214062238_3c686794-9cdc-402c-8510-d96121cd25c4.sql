-- Fix: Allow business owners to view sale_items via the sales relationship
DROP POLICY IF EXISTS "Staff with sales.view can view sale items" ON public.sale_items;

CREATE POLICY "Users can view sale items for their business" 
ON public.sale_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM sales sa
    WHERE sa.id = sale_items.sale_id
    AND (
      -- Business owner
      EXISTS (
        SELECT 1 FROM businesses b 
        WHERE b.id = sa.business_id 
        AND b.owner_user_id = auth.uid()
      )
      -- OR active staff member
      OR EXISTS (
        SELECT 1 FROM staff s 
        WHERE s.business_id = sa.business_id 
        AND s.user_id = auth.uid() 
        AND s.is_active = true
      )
    )
  )
);