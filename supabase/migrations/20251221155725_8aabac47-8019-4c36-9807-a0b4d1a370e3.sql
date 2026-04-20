-- Create a function to copy system role templates to a new business
CREATE OR REPLACE FUNCTION public.copy_system_role_templates_to_business(p_business_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
BEGIN
  -- Copy all system role templates to the business
  FOR v_template IN 
    SELECT id, name, description, permissions, discount_limit, refund_limit
    FROM role_templates 
    WHERE is_system = true AND is_active = true
  LOOP
    -- Check if this template already exists for the business (by name)
    IF NOT EXISTS (
      SELECT 1 FROM role_templates 
      WHERE business_id = p_business_id AND name = v_template.name
    ) THEN
      INSERT INTO role_templates (
        business_id, 
        name, 
        description, 
        permissions, 
        discount_limit, 
        refund_limit,
        is_system, 
        is_active
      ) VALUES (
        p_business_id,
        v_template.name,
        v_template.description,
        v_template.permissions,
        v_template.discount_limit,
        v_template.refund_limit,
        false, -- Business copies are not system templates
        true
      );
    END IF;
  END LOOP;
END;
$$;

-- Create a trigger function to auto-copy role templates when a new business is created
CREATE OR REPLACE FUNCTION public.on_business_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
      'role_templates_copied', true
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on businesses table
DROP TRIGGER IF EXISTS trigger_on_business_created ON businesses;
CREATE TRIGGER trigger_on_business_created
  AFTER INSERT ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION on_business_created();

-- Create a trigger function to log branch creation with role assignments
CREATE OR REPLACE FUNCTION public.on_branch_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business RECORD;
BEGIN
  -- Get business info
  SELECT trading_name, owner_user_id, owner_name INTO v_business
  FROM businesses WHERE id = NEW.business_id;
  
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
    COALESCE(v_business.owner_user_id, auth.uid(), '00000000-0000-0000-0000-000000000000'),
    COALESCE(v_business.owner_name, 'Business Owner'),
    'super_admin',
    'branch_created',
    'business',
    NEW.id::text,
    NEW.name,
    '0.0.0.0',
    jsonb_build_object(
      'branch_id', NEW.id,
      'branch_name', NEW.name,
      'business_id', NEW.business_id,
      'business_name', v_business.trading_name,
      'is_main', NEW.is_main
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create the trigger on branches table
DROP TRIGGER IF EXISTS trigger_on_branch_created ON branches;
CREATE TRIGGER trigger_on_branch_created
  AFTER INSERT ON branches
  FOR EACH ROW
  EXECUTE FUNCTION on_branch_created();

-- Create a function to sync role template changes to all businesses
CREATE OR REPLACE FUNCTION public.sync_system_role_template_to_businesses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only sync if this is a system template being updated
  IF NEW.is_system = true THEN
    -- Log the system role template update for super admin
    INSERT INTO admin_audit_logs (
      admin_user_id,
      admin_name,
      role,
      action,
      entity_type,
      entity_id,
      entity_name,
      ip_address,
      before_value,
      after_value
    ) VALUES (
      COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'),
      'System',
      'super_admin',
      'system_role_template_updated',
      'staff',
      NEW.id::text,
      NEW.name,
      '0.0.0.0',
      CASE WHEN TG_OP = 'UPDATE' THEN 
        jsonb_build_object(
          'name', OLD.name,
          'permissions', OLD.permissions,
          'is_locked', OLD.is_locked
        )::text
      ELSE NULL END,
      jsonb_build_object(
        'name', NEW.name,
        'permissions', NEW.permissions,
        'is_locked', NEW.is_locked,
        'businesses_affected', (SELECT COUNT(*) FROM businesses)
      )::text
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger on role_templates table
DROP TRIGGER IF EXISTS trigger_sync_system_role_template ON role_templates;
CREATE TRIGGER trigger_sync_system_role_template
  AFTER INSERT OR UPDATE ON role_templates
  FOR EACH ROW
  WHEN (NEW.is_system = true)
  EXECUTE FUNCTION sync_system_role_template_to_businesses();

-- Copy system role templates to all existing businesses that don't have them yet
DO $$
DECLARE
  v_business_id uuid;
BEGIN
  FOR v_business_id IN SELECT id FROM businesses LOOP
    PERFORM copy_system_role_templates_to_business(v_business_id);
  END LOOP;
END;
$$;