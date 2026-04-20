-- Add currency column to businesses table
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN';

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.currency IS 'Currency code for the business (e.g., NGN, USD, GBP, EUR)';