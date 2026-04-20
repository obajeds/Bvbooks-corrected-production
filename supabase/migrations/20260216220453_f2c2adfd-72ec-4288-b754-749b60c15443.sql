CREATE POLICY "Staff can update business_notifications"
  ON business_notifications
  FOR UPDATE
  TO public
  USING (business_id = get_staff_business_id())
  WITH CHECK (business_id = get_staff_business_id());