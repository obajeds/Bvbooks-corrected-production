-- Step 1: Create new plan enum with correct names
CREATE TYPE public.bvbooks_plan AS ENUM ('trial', 'free', 'basic', 'premium');

-- Step 2: Create plan_features table for feature gating
CREATE TABLE public.plan_features (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan public.bvbooks_plan NOT NULL,
    feature_key TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    limits JSONB DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(plan, feature_key)
);

-- Step 3: Create plan_limits table for branch/staff limits
CREATE TABLE public.plan_limits (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    plan public.bvbooks_plan NOT NULL UNIQUE,
    max_branches INTEGER NOT NULL DEFAULT 1,
    max_staff INTEGER NOT NULL DEFAULT 3,
    max_products INTEGER,
    trial_days INTEGER DEFAULT 30,
    description TEXT,
    monthly_price NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'NGN',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 4: Create business_plan_overrides for super admin overrides
CREATE TABLE public.business_plan_overrides (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    override_limits JSONB DEFAULT '{}',
    reason TEXT,
    overridden_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(business_id, feature_key)
);

-- Step 5: Create feature_changelog for audit trail
CREATE TABLE public.feature_changelog (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    feature_key TEXT NOT NULL,
    action TEXT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by UUID,
    changed_by_name TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 6: Add new columns to businesses table for new plan system
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS current_plan public.bvbooks_plan DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '30 days'),
ADD COLUMN IF NOT EXISTS plan_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- Step 7: Enable RLS on new tables
ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_plan_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_changelog ENABLE ROW LEVEL SECURITY;

-- Step 8: RLS policies for plan_features (readable by all authenticated, managed by super admin)
CREATE POLICY "Anyone can view plan features"
ON public.plan_features FOR SELECT
USING (true);

CREATE POLICY "Super admin can manage plan features"
ON public.plan_features FOR ALL
USING (has_admin_role(auth.uid(), 'super_admin'))
WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

-- Step 9: RLS policies for plan_limits
CREATE POLICY "Anyone can view plan limits"
ON public.plan_limits FOR SELECT
USING (true);

CREATE POLICY "Super admin can manage plan limits"
ON public.plan_limits FOR ALL
USING (has_admin_role(auth.uid(), 'super_admin'))
WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

-- Step 10: RLS policies for business_plan_overrides
CREATE POLICY "Business owners can view their overrides"
ON public.business_plan_overrides FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "Super admin can manage all overrides"
ON public.business_plan_overrides FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Step 11: RLS policies for feature_changelog
CREATE POLICY "Business owners can view their changelog"
ON public.feature_changelog FOR SELECT
USING (business_id IS NULL OR is_business_owner(business_id));

CREATE POLICY "Super admin can view all changelog"
ON public.feature_changelog FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert changelog"
ON public.feature_changelog FOR INSERT
WITH CHECK (is_admin(auth.uid()) OR (business_id IS NOT NULL AND is_business_owner(business_id)));

-- Step 12: Insert default plan limits
INSERT INTO public.plan_limits (plan, max_branches, max_staff, max_products, trial_days, description, monthly_price) VALUES
('trial', 3, 5, 100, 30, '30-day free trial with Premium features', 0),
('free', 1, 2, 50, NULL, 'Basic visibility features', 0),
('basic', 2, 5, 500, NULL, 'Introduce control features', 15000),
('premium', 3, 15, NULL, NULL, 'Full discipline and loss prevention', 35000);

-- Step 13: Create function to check if feature is enabled for a business
CREATE OR REPLACE FUNCTION public.is_feature_enabled(
    _business_id UUID,
    _feature_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _plan public.bvbooks_plan;
    _override_enabled BOOLEAN;
    _plan_enabled BOOLEAN;
    _trial_expired BOOLEAN;
BEGIN
    -- Get business plan
    SELECT current_plan, 
           CASE WHEN current_plan = 'trial' AND trial_ends_at < now() THEN true ELSE false END
    INTO _plan, _trial_expired
    FROM businesses 
    WHERE id = _business_id;
    
    -- If trial expired, treat as free
    IF _trial_expired THEN
        _plan := 'free';
    END IF;
    
    -- Check for business-specific override first
    SELECT is_enabled INTO _override_enabled
    FROM business_plan_overrides
    WHERE business_id = _business_id 
      AND feature_key = _feature_key
      AND (expires_at IS NULL OR expires_at > now());
    
    IF _override_enabled IS NOT NULL THEN
        RETURN _override_enabled;
    END IF;
    
    -- Check plan features
    SELECT is_enabled INTO _plan_enabled
    FROM plan_features
    WHERE plan = _plan AND feature_key = _feature_key;
    
    RETURN COALESCE(_plan_enabled, false);
END;
$$;

-- Step 14: Create function to get business feature limits
CREATE OR REPLACE FUNCTION public.get_feature_limits(
    _business_id UUID,
    _feature_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _plan public.bvbooks_plan;
    _override_limits JSONB;
    _plan_limits JSONB;
BEGIN
    -- Get business plan
    SELECT CASE 
        WHEN current_plan = 'trial' AND trial_ends_at < now() THEN 'free'::bvbooks_plan
        ELSE current_plan 
    END INTO _plan
    FROM businesses 
    WHERE id = _business_id;
    
    -- Check for override limits first
    SELECT override_limits INTO _override_limits
    FROM business_plan_overrides
    WHERE business_id = _business_id 
      AND feature_key = _feature_key
      AND (expires_at IS NULL OR expires_at > now());
    
    IF _override_limits IS NOT NULL AND _override_limits != '{}' THEN
        RETURN _override_limits;
    END IF;
    
    -- Get plan limits
    SELECT limits INTO _plan_limits
    FROM plan_features
    WHERE plan = _plan AND feature_key = _feature_key;
    
    RETURN COALESCE(_plan_limits, '{}');
END;
$$;

-- Step 15: Create function to get plan branch limit
CREATE OR REPLACE FUNCTION public.get_plan_branch_limit(_business_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _plan public.bvbooks_plan;
    _max_branches INTEGER;
    _addon_branches INTEGER;
BEGIN
    -- Get business plan
    SELECT CASE 
        WHEN current_plan = 'trial' AND trial_ends_at < now() THEN 'free'::bvbooks_plan
        ELSE current_plan 
    END INTO _plan
    FROM businesses 
    WHERE id = _business_id;
    
    -- Get base limit
    SELECT max_branches INTO _max_branches
    FROM plan_limits
    WHERE plan = _plan;
    
    -- Add addon branches
    SELECT COALESCE(SUM(ba.quantity), 0) INTO _addon_branches
    FROM business_addons ba
    JOIN addon_features af ON af.id = ba.addon_feature_id
    WHERE ba.business_id = _business_id 
      AND ba.status = 'active'
      AND af.feature_key = 'extra_branch';
    
    RETURN COALESCE(_max_branches, 1) + COALESCE(_addon_branches, 0);
END;
$$;

-- Step 16: Create updated_at triggers
CREATE TRIGGER update_plan_features_updated_at
    BEFORE UPDATE ON public.plan_features
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_limits_updated_at
    BEFORE UPDATE ON public.plan_limits
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_plan_overrides_updated_at
    BEFORE UPDATE ON public.business_plan_overrides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();