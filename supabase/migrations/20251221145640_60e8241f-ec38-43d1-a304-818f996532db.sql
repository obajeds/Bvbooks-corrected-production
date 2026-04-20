-- Add RLS policies for staff with POS permissions on sales table

-- Allow staff with pos.sale.create to insert sales
CREATE POLICY "Staff with pos.sale.create can insert sales"
ON public.sales
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'pos.sale.create'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = sales.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Allow staff with sales.view to view sales
CREATE POLICY "Staff with sales.view can view sales"
ON public.sales
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = sales.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Allow staff with sales.edit to update sales
CREATE POLICY "Staff with sales.edit can update sales"
ON public.sales
FOR UPDATE
USING (
  has_permission(auth.uid(), 'sales.edit'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = sales.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Allow staff with sales.delete to delete sales
CREATE POLICY "Staff with sales.delete can delete sales"
ON public.sales
FOR DELETE
USING (
  has_permission(auth.uid(), 'sales.delete'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = sales.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Add RLS policies for staff on sale_items table

-- Allow staff with pos.sale.create to insert sale items
CREATE POLICY "Staff with pos.sale.create can insert sale items"
ON public.sale_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sales sa
    JOIN staff s ON s.business_id = sa.business_id
    WHERE sa.id = sale_items.sale_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Allow staff with sales.view to view sale items
CREATE POLICY "Staff with sales.view can view sale items"
ON public.sale_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sales sa
    JOIN staff s ON s.business_id = sa.business_id
    WHERE sa.id = sale_items.sale_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  )
);

-- Add RLS policies for customers table (needed for POS customer lookup)
CREATE POLICY "Staff with crm.view can view customers"
ON public.customers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = customers.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Staff with crm.manage can insert customers
CREATE POLICY "Staff with crm.manage can insert customers"
ON public.customers
FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'crm.manage'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = customers.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Staff with crm.manage can update customers
CREATE POLICY "Staff with crm.manage can update customers"
ON public.customers
FOR UPDATE
USING (
  has_permission(auth.uid(), 'crm.manage'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = customers.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);