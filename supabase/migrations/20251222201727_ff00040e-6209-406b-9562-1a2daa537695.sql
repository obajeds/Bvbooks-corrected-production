-- Allow authenticated users to create their own business
CREATE POLICY "Users can create their own business"
ON public.businesses
FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid());