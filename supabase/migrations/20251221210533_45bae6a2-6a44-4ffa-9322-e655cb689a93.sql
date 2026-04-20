-- Create add-on features table (managed by super admin)
CREATE TABLE public.addon_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,
  price_per_unit NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NGN',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_plans subscription_plan[] NOT NULL DEFAULT '{starter,professional,enterprise}'::subscription_plan[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create business add-on subscriptions table (tracks what each business has purchased)
CREATE TABLE public.business_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  addon_feature_id UUID NOT NULL REFERENCES public.addon_features(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  payment_reference TEXT,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(business_id, addon_feature_id)
);

-- Enable RLS
ALTER TABLE public.addon_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_addons ENABLE ROW LEVEL SECURITY;

-- Addon features policies (super admin manages, all can view active features)
CREATE POLICY "Super admin can manage addon features"
ON public.addon_features FOR ALL
USING (has_admin_role(auth.uid(), 'super_admin'))
WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

CREATE POLICY "Finance admin can view addon features"
ON public.addon_features FOR SELECT
USING (has_admin_role(auth.uid(), 'finance_admin'));

CREATE POLICY "Business owners can view active addon features"
ON public.addon_features FOR SELECT
USING (is_active = true AND EXISTS (
  SELECT 1 FROM businesses WHERE owner_user_id = auth.uid()
));

-- Business addons policies
CREATE POLICY "Super admin can manage all business addons"
ON public.business_addons FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Business owners can view their addons"
ON public.business_addons FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "Business owners can insert their addons"
ON public.business_addons FOR INSERT
WITH CHECK (is_business_owner(business_id));

-- Insert default add-on feature for extra branches
INSERT INTO public.addon_features (feature_key, feature_name, description, price_per_unit, billing_period)
VALUES ('extra_branch', 'Extra Branch', 'Add additional branches beyond your plan limit', 1500, 'monthly');

-- Create updated_at triggers
CREATE TRIGGER update_addon_features_updated_at
BEFORE UPDATE ON public.addon_features
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_addons_updated_at
BEFORE UPDATE ON public.business_addons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();