-- Allow staff with inventory permissions to view categories
CREATE POLICY "Staff with inventory.view can view categories"
ON public.categories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = categories.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.create to insert categories
CREATE POLICY "Staff with inventory.item.create can insert categories"
ON public.categories
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'inventory.item.create'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = categories.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.edit to update categories
CREATE POLICY "Staff with inventory.item.edit can update categories"
ON public.categories
FOR UPDATE
USING (
  has_permission(auth.uid(), 'inventory.item.edit'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = categories.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.delete to delete categories
CREATE POLICY "Staff with inventory.item.delete can delete categories"
ON public.categories
FOR DELETE
USING (
  has_permission(auth.uid(), 'inventory.item.delete'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = categories.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory permissions to view products
CREATE POLICY "Staff with inventory.view can view products"
ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = products.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.create to insert products
CREATE POLICY "Staff with inventory.item.create can insert products"
ON public.products
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'inventory.item.create'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = products.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.edit to update products
CREATE POLICY "Staff with inventory.item.edit can update products"
ON public.products
FOR UPDATE
USING (
  has_permission(auth.uid(), 'inventory.item.edit'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = products.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with inventory.item.delete to delete products
CREATE POLICY "Staff with inventory.item.delete can delete products"
ON public.products
FOR DELETE
USING (
  has_permission(auth.uid(), 'inventory.item.delete'::permission_key)
  AND EXISTS (
    SELECT 1 FROM public.staff s
    WHERE s.business_id = products.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);