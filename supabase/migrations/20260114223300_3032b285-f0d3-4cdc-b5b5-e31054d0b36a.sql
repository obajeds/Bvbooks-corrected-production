-- Add unit column to pumps table (L = Liters, Kg = Kilograms)
ALTER TABLE public.pumps 
ADD COLUMN unit TEXT NOT NULL DEFAULT 'L' CHECK (unit IN ('L', 'Kg'));

-- Update existing LPG pumps to use Kg by default
UPDATE public.pumps SET unit = 'Kg' WHERE fuel_type = 'lpg';