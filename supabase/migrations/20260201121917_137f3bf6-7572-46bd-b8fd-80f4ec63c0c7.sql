-- Add missing RLS policies for branches table
-- Business owners need INSERT, UPDATE, DELETE permissions

-- Policy for owners to insert branches
CREATE POLICY "Owners can insert branches"
ON public.branches
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_owner(business_id)
);

-- Policy for owners to update their branches
CREATE POLICY "Owners can update branches"
ON public.branches
FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));

-- Policy for owners to delete branches
CREATE POLICY "Owners can delete branches"
ON public.branches
FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));

-- Policy for owners to view all branches
CREATE POLICY "Owners can view all branches"
ON public.branches
FOR SELECT
TO authenticated
USING (public.is_business_owner(business_id));