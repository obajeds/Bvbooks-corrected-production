
-- Step 1: Add new columns
ALTER TABLE public.measurement_units
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_base boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- Step 2: Unique index on system unit abbreviations (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_units_system_abbr
  ON public.measurement_units (LOWER(abbreviation))
  WHERE is_system = true;

-- Step 3: Unique index on per-business custom unit abbreviations (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS idx_measurement_units_business_abbr
  ON public.measurement_units (business_id, LOWER(abbreviation))
  WHERE is_system = false;

-- Step 4: Update existing 10 system units with category and is_base values
UPDATE public.measurement_units SET category = 'Packaging', is_base = false WHERE is_system = true AND LOWER(name) = 'boxes';
UPDATE public.measurement_units SET category = 'Length', is_base = false WHERE is_system = true AND LOWER(name) = 'centimeters';
UPDATE public.measurement_units SET category = 'Quantity', is_base = false WHERE is_system = true AND LOWER(name) = 'dozens';
UPDATE public.measurement_units SET category = 'Weight', is_base = true WHERE is_system = true AND LOWER(name) = 'grams';
UPDATE public.measurement_units SET category = 'Weight', is_base = false WHERE is_system = true AND LOWER(name) = 'kilograms';
UPDATE public.measurement_units SET category = 'Volume', is_base = true WHERE is_system = true AND LOWER(name) = 'liters';
UPDATE public.measurement_units SET category = 'Length', is_base = true WHERE is_system = true AND LOWER(name) = 'meters';
UPDATE public.measurement_units SET category = 'Volume', is_base = false WHERE is_system = true AND LOWER(name) = 'milliliters';
UPDATE public.measurement_units SET category = 'Packaging', is_base = false WHERE is_system = true AND LOWER(name) = 'packs';
UPDATE public.measurement_units SET category = 'Quantity', is_base = true WHERE is_system = true AND LOWER(name) = 'pieces';

-- Step 5: Insert ~45 new system units (idempotent - skip if abbreviation or name already exists)
INSERT INTO public.measurement_units (name, abbreviation, is_system, category, is_base, active)
SELECT v.name, v.abbreviation, true, v.category, v.is_base, true
FROM (VALUES
  ('Each', 'EA', 'Quantity', true),
  ('Unit', 'UN', 'Quantity', false),
  ('Piece', 'PC', 'Quantity', false),
  ('Pair', 'PR', 'Quantity', false),
  ('Set', 'ST', 'Quantity', false),
  ('Dozen', 'DZ', 'Quantity', false),
  ('Gross', 'GS', 'Quantity', false),
  ('Lot', 'LO', 'Quantity', false),
  ('Pack', 'PK', 'Packaging', false),
  ('Box', 'BX', 'Packaging', false),
  ('Carton', 'CT', 'Packaging', false),
  ('Case', 'CS', 'Packaging', false),
  ('Bundle', 'BND', 'Packaging', false),
  ('Bag', 'BG', 'Packaging', false),
  ('Sack', 'SA', 'Packaging', false),
  ('Bale', 'BL', 'Packaging', false),
  ('Tray', 'TR', 'Packaging', false),
  ('Crate', 'CR', 'Packaging', false),
  ('Pallet', 'PL', 'Packaging', false),
  ('Bottle', 'BO', 'Packaging', false),
  ('Can', 'CN', 'Packaging', false),
  ('Jar', 'JR', 'Packaging', false),
  ('Drum', 'DR', 'Packaging', false),
  ('Roll', 'RL', 'Roll/Spool', false),
  ('Coil', 'CL', 'Roll/Spool', false),
  ('Sheet', 'SH', 'Roll/Spool', false),
  ('Rod', 'RD', 'Roll/Spool', false),
  ('Bar', 'BR', 'Roll/Spool', false),
  ('Tube', 'TU', 'Roll/Spool', false),
  ('Spool', 'SO', 'Roll/Spool', false),
  ('Ream', 'RM', 'Roll/Spool', false),
  ('Milligram', 'MG', 'Weight', false),
  ('Gram', 'G', 'Weight', false),
  ('Kilogram', 'KG', 'Weight', false),
  ('Tonne', 'TNE', 'Weight', false),
  ('Ounce', 'OZ', 'Weight', false),
  ('Pound', 'LB', 'Weight', false),
  ('Milliliter', 'ML', 'Volume', false),
  ('Centiliter', 'CLT', 'Volume', false),
  ('Liter', 'L', 'Volume', false),
  ('Gallon', 'GAL', 'Volume', false),
  ('Pint', 'PT', 'Volume', false),
  ('Quart', 'QT', 'Volume', false),
  ('Cubic meter', 'M3', 'Volume', false),
  ('Millimeter', 'MM', 'Length', false),
  ('Centimeter', 'CM', 'Length', false),
  ('Meter', 'M', 'Length', false),
  ('Kilometer', 'KM', 'Length', false),
  ('Inch', 'IN', 'Length', false),
  ('Foot', 'FT', 'Length', false),
  ('Yard', 'YD', 'Length', false),
  ('Square meter', 'M2', 'Area', false),
  ('Square foot', 'FT2', 'Area', false),
  ('Square yard', 'SY', 'Area', false),
  ('Truckload', 'TC', 'Bulk', false)
) AS v(name, abbreviation, category, is_base)
WHERE NOT EXISTS (
  SELECT 1 FROM public.measurement_units mu
  WHERE mu.is_system = true AND LOWER(mu.abbreviation) = LOWER(v.abbreviation)
)
AND NOT EXISTS (
  SELECT 1 FROM public.measurement_units mu
  WHERE mu.is_system = true AND LOWER(mu.name) = LOWER(v.name)
);
