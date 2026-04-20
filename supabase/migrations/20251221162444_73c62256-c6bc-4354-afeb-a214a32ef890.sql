-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create notification_settings table for businesses
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  low_stock_alerts_enabled BOOLEAN NOT NULL DEFAULT false,
  low_stock_alerts_email TEXT,
  daily_sales_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  daily_sales_summary_email TEXT,
  weekly_sales_summary_enabled BOOLEAN NOT NULL DEFAULT false,
  weekly_sales_summary_email TEXT,
  new_order_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id)
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Business owners can view their notification settings"
ON public.notification_settings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = notification_settings.business_id 
    AND b.owner_user_id = auth.uid()
  )
  OR 
  EXISTS (
    SELECT 1 FROM public.staff s 
    WHERE s.business_id = notification_settings.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

CREATE POLICY "Business owners can insert their notification settings"
ON public.notification_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = notification_settings.business_id 
    AND b.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Business owners can update their notification settings"
ON public.notification_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.businesses b 
    WHERE b.id = notification_settings.business_id 
    AND b.owner_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create default notification settings for existing businesses
INSERT INTO public.notification_settings (business_id)
SELECT id FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;