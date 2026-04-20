
-- Allow staff to update their own attendance records (for clock-out)
CREATE POLICY "Staff can update own attendance"
ON attendance FOR UPDATE
TO authenticated
USING (
  staff_id IN (
    SELECT id FROM staff WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  staff_id IN (
    SELECT id FROM staff WHERE user_id = auth.uid() AND is_active = true
  )
);
