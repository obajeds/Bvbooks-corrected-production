-- Add RLS policy to ensure staff can only create approval requests if they have the appropriate permission
-- For stock_adjustment type, require inventory.adjust.create permission
-- For refund type, require pos.sale.refund permission
-- For discount type, require pos.discount.override permission

CREATE POLICY "Staff can create approval requests with appropriate permissions"
ON public.approval_requests
FOR INSERT
WITH CHECK (
  -- Business owners can always create
  is_business_owner(business_id)
  OR
  -- Staff must have appropriate permission based on request type
  (
    EXISTS (
      SELECT 1 FROM staff s 
      WHERE s.id = requested_by 
      AND s.user_id = auth.uid() 
      AND s.is_active = true
      AND s.business_id = approval_requests.business_id
    )
    AND (
      -- Stock adjustment requires inventory.adjust.create
      (request_type = 'stock_adjustment' AND has_permission(auth.uid(), 'inventory.adjust.create'))
      OR
      -- Refund requires pos.sale.refund
      (request_type = 'refund' AND has_permission(auth.uid(), 'pos.sale.refund'))
      OR
      -- Discount override requires pos.discount.override
      (request_type = 'discount' AND has_permission(auth.uid(), 'pos.discount.override'))
      OR
      -- Other types - staff in business can create
      (request_type NOT IN ('stock_adjustment', 'refund', 'discount'))
    )
  )
);