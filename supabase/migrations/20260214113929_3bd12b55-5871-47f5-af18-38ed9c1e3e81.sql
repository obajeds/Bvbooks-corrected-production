CREATE POLICY "Staff can create approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT s.business_id FROM staff s
      WHERE s.user_id = auth.uid() AND s.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM businesses b
      WHERE b.id = approval_requests.business_id
      AND b.owner_user_id = auth.uid()
    )
  );