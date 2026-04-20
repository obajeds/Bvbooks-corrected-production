
-- Fix storage policies for product-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;

-- Business-scoped upload policy for product-images
CREATE POLICY "Business members can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Business-scoped update policy for product-images
CREATE POLICY "Business members can update product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Business-scoped delete policy for product-images
CREATE POLICY "Business members can delete product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Fix storage policies for category-images bucket
DROP POLICY IF EXISTS "Authenticated users can upload category images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own category images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete category images" ON storage.objects;

-- Business-scoped upload policy for category-images
CREATE POLICY "Business members can upload category images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Business-scoped update policy for category-images
CREATE POLICY "Business members can update category images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Business-scoped delete policy for category-images
CREATE POLICY "Business members can delete category images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-images' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id::text FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);
