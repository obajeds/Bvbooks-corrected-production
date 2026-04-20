-- Add logo_url column to businesses table
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.logo_url IS 'URL to the business logo stored in Supabase Storage';