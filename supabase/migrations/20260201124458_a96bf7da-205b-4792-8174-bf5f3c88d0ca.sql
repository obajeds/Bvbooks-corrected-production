-- Add explicit RLS policies for business owners on products table
-- This allows owners to manage products without requiring a staff record

-- Allow business owners to insert products
CREATE POLICY "Owners can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_business_owner(business_id)
);

-- Allow business owners to update products
CREATE POLICY "Owners can update products"
ON public.products
FOR UPDATE
TO authenticated
USING (public.is_business_owner(business_id))
WITH CHECK (public.is_business_owner(business_id));

-- Allow business owners to delete products
CREATE POLICY "Owners can delete products"
ON public.products
FOR DELETE
TO authenticated
USING (public.is_business_owner(business_id));