-- Add RLS policies for settlements table so business users can manage their settlements

-- Policy for business owners and staff to view their own settlements
CREATE POLICY "Users can view their business settlements"
ON public.settlements
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy for business owners and staff to insert settlements
CREATE POLICY "Users can insert their business settlements"
ON public.settlements
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy for business owners and staff to update their business settlements
CREATE POLICY "Users can update their business settlements"
ON public.settlements
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Policy for business owners and staff to delete their business settlements
CREATE POLICY "Users can delete their business settlements"
ON public.settlements
FOR DELETE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);