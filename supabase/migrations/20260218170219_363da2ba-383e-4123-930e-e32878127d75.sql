CREATE POLICY "Owners can delete approval requests"
ON public.approval_requests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses b
    WHERE b.id = approval_requests.business_id
    AND b.owner_user_id = auth.uid()
  )
);