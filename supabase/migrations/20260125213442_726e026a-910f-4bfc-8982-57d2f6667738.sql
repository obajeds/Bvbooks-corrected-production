-- Add optional image_url column to categories table
ALTER TABLE public.categories
ADD COLUMN image_url TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.categories.image_url IS 'Optional category image URL for visual POS displays (restaurants, retail)';

-- Create storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload category images
CREATE POLICY "Authenticated users can upload category images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'category-images');

-- Allow public read access to category images
CREATE POLICY "Anyone can view category images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'category-images');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update category images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'category-images');

-- Allow authenticated users to delete category images
CREATE POLICY "Authenticated users can delete category images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'category-images');