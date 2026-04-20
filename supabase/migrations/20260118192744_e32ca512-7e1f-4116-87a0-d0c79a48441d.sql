-- Create storage bucket for business logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('business-logos', 'business-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their business folder
CREATE POLICY "Business owners can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
  )
);

-- Allow authenticated users to update their business logos
CREATE POLICY "Business owners can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
  )
);

-- Allow authenticated users to delete their business logos
CREATE POLICY "Business owners can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_user_id = auth.uid()
  )
);

-- Allow public read access to logos
CREATE POLICY "Anyone can view business logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');