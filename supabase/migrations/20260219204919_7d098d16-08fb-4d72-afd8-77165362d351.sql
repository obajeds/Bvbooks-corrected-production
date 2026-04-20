
-- Owner SELECT
CREATE POLICY "Owner can view barcode settings"
ON public.barcode_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = barcode_settings.business_id
      AND businesses.owner_user_id = auth.uid()
  )
);

-- Owner INSERT
CREATE POLICY "Owner can insert barcode settings"
ON public.barcode_settings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = barcode_settings.business_id
      AND businesses.owner_user_id = auth.uid()
  )
);

-- Owner UPDATE
CREATE POLICY "Owner can update barcode settings"
ON public.barcode_settings FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = barcode_settings.business_id
      AND businesses.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM businesses
    WHERE businesses.id = barcode_settings.business_id
      AND businesses.owner_user_id = auth.uid()
  )
);
