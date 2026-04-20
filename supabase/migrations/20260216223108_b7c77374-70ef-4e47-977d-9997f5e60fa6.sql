
-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "Owners can create departments" ON departments;
CREATE POLICY "Owners and managers can create departments"
ON departments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
  OR has_permission(auth.uid(), 'staff.manage')
);

-- Drop and recreate UPDATE policy
DROP POLICY IF EXISTS "Owners can update departments" ON departments;
CREATE POLICY "Owners and managers can update departments"
ON departments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
  OR has_permission(auth.uid(), 'staff.manage')
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
  OR has_permission(auth.uid(), 'staff.manage')
);

-- Drop and recreate DELETE policy
DROP POLICY IF EXISTS "Owners can delete departments" ON departments;
CREATE POLICY "Owners and managers can delete departments"
ON departments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
  OR has_permission(auth.uid(), 'staff.manage')
);
