
-- Fix get_plan_branch_limit: remove 'trial' reference
CREATE OR REPLACE FUNCTION public.get_plan_branch_limit(_business_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _plan public.bvbooks_plan;
    _max_branches INTEGER;
    _addon_branches INTEGER;
BEGIN
    IF NOT can_access_business(_business_id) THEN
        RAISE EXCEPTION 'Access denied to business data';
    END IF;

    SELECT current_plan INTO _plan
    FROM businesses 
    WHERE id = _business_id;
    
    SELECT max_branches INTO _max_branches
    FROM plan_limits
    WHERE plan = _plan;
    
    SELECT COALESCE(SUM(ba.quantity), 0) INTO _addon_branches
    FROM business_addons ba
    JOIN addon_features af ON af.id = ba.addon_feature_id
    WHERE ba.business_id = _business_id 
      AND ba.status = 'active'
      AND af.feature_key = 'extra_branch';
    
    RETURN COALESCE(_max_branches, 1) + COALESCE(_addon_branches, 0);
END;
$function$;

-- Fix get_plan_staff_limit: remove 'trial' reference
CREATE OR REPLACE FUNCTION public.get_plan_staff_limit(_business_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _plan public.bvbooks_plan;
    _max_staff INTEGER;
    _addon_staff INTEGER;
BEGIN
    IF NOT can_access_business(_business_id) THEN
        RAISE EXCEPTION 'Access denied to business data';
    END IF;

    SELECT current_plan INTO _plan
    FROM businesses 
    WHERE id = _business_id;
    
    SELECT max_staff INTO _max_staff
    FROM plan_limits
    WHERE plan = _plan;
    
    SELECT COALESCE(SUM(ba.quantity * 2), 0) INTO _addon_staff
    FROM business_addons ba
    JOIN addon_features af ON af.id = ba.addon_feature_id
    WHERE ba.business_id = _business_id 
      AND ba.status = 'active'
      AND af.feature_key = 'extra_branch';
    
    RETURN COALESCE(_max_staff, 2) + COALESCE(_addon_staff, 0);
END;
$function$;

-- Fix enforce_subscription_access: remove trial expiry check
CREATE OR REPLACE FUNCTION public.enforce_subscription_access(_business_id uuid, _feature_key text DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _business RECORD;
BEGIN
  SELECT 
    id, subscription_plan, subscription_expiry, account_status, current_plan,
    plan_expires_at
  INTO _business
  FROM businesses 
  WHERE id = _business_id;
  
  IF _business IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'BUSINESS_NOT_FOUND');
  END IF;
  
  IF _business.account_status != 'active' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ACCOUNT_SUSPENDED', 'status', _business.account_status::text);
  END IF;
  
  IF _business.subscription_expiry IS NOT NULL AND _business.subscription_expiry <= now() THEN
    IF _business.subscription_plan = 'starter' OR _business.current_plan = 'free' THEN
      RETURN jsonb_build_object('allowed', true, 'plan', 'starter', 'limited', true);
    END IF;
    
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'SUBSCRIPTION_EXPIRED',
      'expired_at', _business.subscription_expiry,
      'plan', _business.subscription_plan::text
    );
  END IF;
  
  IF _feature_key IS NOT NULL THEN
    IF NOT is_feature_enabled(_business_id, _feature_key) THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'FEATURE_NOT_AVAILABLE', 'feature', _feature_key);
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'allowed', true,
    'plan', COALESCE(_business.current_plan::text, _business.subscription_plan::text),
    'expires_at', COALESCE(_business.plan_expires_at, _business.subscription_expiry)
  );
END;
$function$;
