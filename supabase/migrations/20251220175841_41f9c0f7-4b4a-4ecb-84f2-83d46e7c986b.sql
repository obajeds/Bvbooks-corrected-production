-- Create custom_roles table for storing business-specific custom roles
CREATE TABLE public.custom_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_custom_roles_business_id ON public.custom_roles(business_id);

-- Enable Row Level Security
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Business owners can manage custom roles"
ON public.custom_roles
FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();