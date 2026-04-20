-- Add explicit RLS policies for business owners on categories table
-- This allows owners to manage categories without requiring a staff record

-- Allow business owners to insert categories
CREATE POLICY "Owners can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_owner(business_id)
);

-- Allow business owners to update categories
CREATE POLICY "Owners can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));

-- Allow business owners to delete categories
CREATE POLICY "Owners can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));