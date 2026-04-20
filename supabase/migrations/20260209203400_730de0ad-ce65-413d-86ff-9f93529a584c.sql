-- Create measurement_units table
CREATE TABLE public.measurement_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.measurement_units ENABLE ROW LEVEL SECURITY;

-- System units are visible to all authenticated users
CREATE POLICY "System units visible to all" ON public.measurement_units
  FOR SELECT USING (is_system = true);

-- Business-specific units visible to business members
CREATE POLICY "Business units visible to members" ON public.measurement_units
  FOR SELECT USING (business_id IS NOT NULL AND can_access_business(business_id));

CREATE POLICY "Business owners can insert units" ON public.measurement_units
  FOR INSERT WITH CHECK (business_id IS NOT NULL AND can_access_business(business_id));

CREATE POLICY "Business owners can update units" ON public.measurement_units
  FOR UPDATE USING (business_id IS NOT NULL AND can_access_business(business_id));

CREATE POLICY "Business owners can delete non-system units" ON public.measurement_units
  FOR DELETE USING (is_system = false AND business_id IS NOT NULL AND can_access_business(business_id));

-- Seed system units
INSERT INTO public.measurement_units (name, abbreviation, is_system) VALUES
  ('Pieces', 'pcs', true),
  ('Kilograms', 'kg', true),
  ('Grams', 'g', true),
  ('Liters', 'L', true),
  ('Milliliters', 'mL', true),
  ('Meters', 'm', true),
  ('Centimeters', 'cm', true),
  ('Boxes', 'box', true),
  ('Packs', 'pk', true),
  ('Dozens', 'dz', true);