-- Add columns to products table for decimal quantity and price-based sales
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS allows_decimal_quantity boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS allows_price_based_sale boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS quantity_type text NOT NULL DEFAULT 'whole' CHECK (quantity_type IN ('whole', 'decimal'));

-- Update existing products based on their unit to enable decimal quantities
UPDATE public.products 
SET allows_decimal_quantity = true, quantity_type = 'decimal'
WHERE unit IN ('kg', 'g', 'L', 'mL', 'm', 'cm', 'Kilograms', 'Grams', 'Liters', 'Milliliters', 'Meters', 'Centimeters');

-- Add comment for documentation
COMMENT ON COLUMN public.products.allows_decimal_quantity IS 'Whether this product can be sold in decimal quantities';
COMMENT ON COLUMN public.products.allows_price_based_sale IS 'Whether this product can be sold by entering a price amount';
COMMENT ON COLUMN public.products.quantity_type IS 'Type of quantity: whole or decimal';