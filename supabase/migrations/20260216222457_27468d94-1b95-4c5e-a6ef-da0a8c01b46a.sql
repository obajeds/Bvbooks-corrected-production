
-- Add owner SELECT policy for departments
CREATE POLICY "Owners can view their departments"
ON departments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
);

-- Add INSERT policy for departments
CREATE POLICY "Owners can create departments"
ON departments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
);

-- Add UPDATE policy for departments
CREATE POLICY "Owners can update departments"
ON departments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
);

-- Add DELETE policy for departments
CREATE POLICY "Owners can delete departments"
ON departments FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE id = departments.business_id
    AND owner_user_id = auth.uid()
  )
);
