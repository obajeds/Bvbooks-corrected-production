-- Create barcode_settings table for admin control
CREATE TABLE public.barcode_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false,
  barcode_type text NOT NULL DEFAULT 'Code128',
  allow_manufacturer_barcode boolean NOT NULL DEFAULT true,
  allow_barcode_printing boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Create barcodes table for barcode records
CREATE TABLE public.barcodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  barcode_value text NOT NULL,
  barcode_type text NOT NULL DEFAULT 'Code128',
  source text NOT NULL DEFAULT 'system_generated' CHECK (source IN ('system_generated', 'manufacturer')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(business_id, barcode_value)
);

-- Create index for fast barcode lookups
CREATE INDEX idx_barcodes_value_active ON public.barcodes(business_id, barcode_value) WHERE is_active = true;
CREATE INDEX idx_barcodes_product ON public.barcodes(product_id) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.barcode_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barcodes ENABLE ROW LEVEL SECURITY;

-- Barcode settings policies
CREATE POLICY "Business owners can manage barcode settings"
ON public.barcode_settings FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Staff can view barcode settings"
ON public.barcode_settings FOR SELECT
USING (EXISTS (
  SELECT 1 FROM staff s 
  WHERE s.business_id = barcode_settings.business_id 
  AND s.user_id = auth.uid() 
  AND s.is_active = true
));

-- Barcodes policies
CREATE POLICY "Business owners can manage barcodes"
ON public.barcodes FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Staff with inventory permission can insert barcodes"
ON public.barcodes FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'inventory.item.create'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = barcodes.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

CREATE POLICY "Staff can view barcodes"
ON public.barcodes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM staff s 
  WHERE s.business_id = barcodes.business_id 
  AND s.user_id = auth.uid() 
  AND s.is_active = true
));

-- Add updated_at trigger
CREATE TRIGGER update_barcode_settings_updated_at
  BEFORE UPDATE ON public.barcode_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();