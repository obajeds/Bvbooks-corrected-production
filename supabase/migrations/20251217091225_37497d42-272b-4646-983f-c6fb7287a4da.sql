-- Create customer_groups table for managing customer segments
CREATE TABLE public.customer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  credit_limit NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create rewards_settings table for configuring rewards system
CREATE TABLE public.rewards_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  points_per_naira NUMERIC DEFAULT 1,
  naira_per_point NUMERIC DEFAULT 0.5,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create business_notifications table for user-facing notifications
CREATE TABLE public.business_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add new columns to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES public.customer_groups(id) ON DELETE SET NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS reward_points NUMERIC DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_balance NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.customer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_groups
CREATE POLICY "Business owners can manage customer groups" ON public.customer_groups
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS policies for rewards_settings
CREATE POLICY "Business owners can manage rewards settings" ON public.rewards_settings
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS policies for business_notifications
CREATE POLICY "Business owners can manage notifications" ON public.business_notifications
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- Add triggers for updated_at
CREATE TRIGGER update_customer_groups_updated_at
  BEFORE UPDATE ON public.customer_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_rewards_settings_updated_at
  BEFORE UPDATE ON public.rewards_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();