CREATE OR REPLACE FUNCTION public.on_business_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Set 30-day free period for new businesses
  IF NEW.current_plan IS NULL OR NEW.current_plan = 'free' THEN
    NEW.current_plan := 'free';
    NEW.account_status := 'active';
    NEW.trial_started_at := now();
    NEW.trial_ends_at := now() + interval '30 days';
    NEW.subscription_plan := 'free';
  END IF;

  -- Copy system role templates to the new business
  PERFORM copy_system_role_templates_to_business(NEW.id);
  
  -- Create an audit log entry for super admin tracking
  INSERT INTO admin_audit_logs (
    admin_user_id,
    admin_name,
    role,
    action,
    entity_type,
    entity_id,
    entity_name,
    ip_address,
    after_value
  ) VALUES (
    COALESCE(NEW.owner_user_id, '00000000-0000-0000-0000-000000000000'),
    COALESCE(NEW.owner_name, 'System'),
    'super_admin',
    'business_created_with_role_templates',
    'business',
    NEW.id::text,
    NEW.trading_name,
    '0.0.0.0',
    jsonb_build_object(
      'business_id', NEW.id,
      'trading_name', NEW.trading_name,
      'owner_email', NEW.owner_email,
      'role_templates_copied', true,
      'trial_ends_at', NEW.trial_ends_at
    )::text
  );
  
  RETURN NEW;
END;
$function$;