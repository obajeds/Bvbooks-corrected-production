
-- Update has_permission() with legacy↔canonical bridging
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission permission_key)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _keys permission_key[];
BEGIN
  -- Owner bypass
  IF EXISTS (
    SELECT 1 FROM businesses WHERE owner_user_id = _user_id
  ) THEN
    RETURN true;
  END IF;

  -- Build alias-aware key set (legacy ↔ canonical mapping)
  _keys := ARRAY[_permission];

  -- Inventory / Stock
  IF _permission = 'inventory.item.create' OR _permission = 'inventory.item.edit' OR _permission = 'inventory.item.delete' THEN
    _keys := _keys || 'stock.catalog.manage'::permission_key;
  ELSIF _permission = 'stock.catalog.manage' THEN
    _keys := _keys || ARRAY['inventory.item.create','inventory.item.edit','inventory.item.delete']::permission_key[];
  ELSIF _permission = 'inventory.adjust.create' THEN
    _keys := _keys || 'stock.adjust'::permission_key;
  ELSIF _permission = 'stock.adjust' THEN
    _keys := _keys || 'inventory.adjust.create'::permission_key;
  ELSIF _permission = 'stock.catalog.view' THEN
    _keys := _keys || 'inventory.item.view'::permission_key;
  ELSIF _permission = 'inventory.item.view' THEN
    _keys := _keys || 'stock.catalog.view'::permission_key;

  -- Sales
  ELSIF _permission = 'sales.view' THEN
    _keys := _keys || 'sales.performance.view'::permission_key;
  ELSIF _permission = 'sales.performance.view' THEN
    _keys := _keys || 'sales.view'::permission_key;
  ELSIF _permission = 'sales.create' THEN
    _keys := _keys || 'sales.transactions.create'::permission_key;
  ELSIF _permission = 'sales.transactions.create' THEN
    _keys := _keys || 'sales.create'::permission_key;
  ELSIF _permission = 'sales.refund' THEN
    _keys := _keys || 'sales.transactions.refund'::permission_key;
  ELSIF _permission = 'sales.transactions.refund' THEN
    _keys := _keys || 'sales.refund'::permission_key;

  -- CRM / Customers
  ELSIF _permission = 'crm.view' THEN
    _keys := _keys || 'customers.overview.view'::permission_key;
  ELSIF _permission = 'customers.overview.view' THEN
    _keys := _keys || 'crm.view'::permission_key;
  ELSIF _permission = 'crm.manage' THEN
    _keys := _keys || 'customers.groups.manage'::permission_key;
  ELSIF _permission = 'customers.groups.manage' THEN
    _keys := _keys || 'crm.manage'::permission_key;

  -- Expenses
  ELSIF _permission = 'expenses.create' THEN
    _keys := _keys || 'operations.expenses.record'::permission_key;
  ELSIF _permission = 'operations.expenses.record' THEN
    _keys := _keys || 'expenses.create'::permission_key;
  ELSIF _permission = 'expenses.view' THEN
    _keys := _keys || 'operations.expenses.view'::permission_key;
  ELSIF _permission = 'operations.expenses.view' THEN
    _keys := _keys || 'expenses.view'::permission_key;
  ELSIF _permission = 'expenses.approve' THEN
    _keys := _keys || 'operations.expenses.approve'::permission_key;
  ELSIF _permission = 'operations.expenses.approve' THEN
    _keys := _keys || 'expenses.approve'::permission_key;

  -- Staff
  ELSIF _permission = 'staff.manage' THEN
    _keys := _keys || 'people.team.manage'::permission_key;
  ELSIF _permission = 'people.team.manage' THEN
    _keys := _keys || 'staff.manage'::permission_key;

  -- Settings
  ELSIF _permission = 'settings.manage' THEN
    _keys := _keys || 'settings.business.manage'::permission_key;
  ELSIF _permission = 'settings.business.manage' THEN
    _keys := _keys || 'settings.manage'::permission_key;

  -- Reports
  ELSIF _permission = 'reports.view.summary' THEN
    _keys := _keys || 'insights.reports.view'::permission_key;
  ELSIF _permission = 'insights.reports.view' THEN
    _keys := _keys || 'reports.view.summary'::permission_key;
  END IF;

  -- Check if staff has any of the aliased permissions
  RETURN EXISTS (
    SELECT 1
    FROM staff s
    INNER JOIN staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sp.permission = ANY(_keys)
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  );
END;
$function$;

-- Update has_branch_permission() with comprehensive legacy↔canonical bridging
CREATE OR REPLACE FUNCTION public.has_branch_permission(_user_id uuid, _branch_id uuid, _permission permission_key)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _keys permission_key[];
BEGIN
  -- Owner bypass: owners have all permissions on all branches
  IF EXISTS (
    SELECT 1 FROM businesses b
    INNER JOIN branches br ON br.business_id = b.id
    WHERE b.owner_user_id = _user_id
      AND br.id = _branch_id
  ) THEN
    RETURN true;
  END IF;

  -- Build alias-aware key set (legacy ↔ canonical mapping)
  _keys := ARRAY[_permission];

  -- Inventory / Stock
  IF _permission = 'inventory.item.create' OR _permission = 'inventory.item.edit' OR _permission = 'inventory.item.delete' THEN
    _keys := _keys || 'stock.catalog.manage'::permission_key;
  ELSIF _permission = 'stock.catalog.manage' THEN
    _keys := _keys || ARRAY['inventory.item.create','inventory.item.edit','inventory.item.delete']::permission_key[];
  ELSIF _permission = 'inventory.adjust.create' THEN
    _keys := _keys || 'stock.adjust'::permission_key;
  ELSIF _permission = 'stock.adjust' THEN
    _keys := _keys || 'inventory.adjust.create'::permission_key;
  ELSIF _permission = 'stock.catalog.view' THEN
    _keys := _keys || 'inventory.item.view'::permission_key;
  ELSIF _permission = 'inventory.item.view' THEN
    _keys := _keys || 'stock.catalog.view'::permission_key;

  -- Sales
  ELSIF _permission = 'sales.view' THEN
    _keys := _keys || 'sales.performance.view'::permission_key;
  ELSIF _permission = 'sales.performance.view' THEN
    _keys := _keys || 'sales.view'::permission_key;
  ELSIF _permission = 'sales.create' THEN
    _keys := _keys || 'sales.transactions.create'::permission_key;
  ELSIF _permission = 'sales.transactions.create' THEN
    _keys := _keys || 'sales.create'::permission_key;
  ELSIF _permission = 'sales.refund' THEN
    _keys := _keys || 'sales.transactions.refund'::permission_key;
  ELSIF _permission = 'sales.transactions.refund' THEN
    _keys := _keys || 'sales.refund'::permission_key;

  -- CRM / Customers
  ELSIF _permission = 'crm.view' THEN
    _keys := _keys || 'customers.overview.view'::permission_key;
  ELSIF _permission = 'customers.overview.view' THEN
    _keys := _keys || 'crm.view'::permission_key;
  ELSIF _permission = 'crm.manage' THEN
    _keys := _keys || 'customers.groups.manage'::permission_key;
  ELSIF _permission = 'customers.groups.manage' THEN
    _keys := _keys || 'crm.manage'::permission_key;

  -- Expenses
  ELSIF _permission = 'expenses.create' THEN
    _keys := _keys || 'operations.expenses.record'::permission_key;
  ELSIF _permission = 'operations.expenses.record' THEN
    _keys := _keys || 'expenses.create'::permission_key;
  ELSIF _permission = 'expenses.view' THEN
    _keys := _keys || 'operations.expenses.view'::permission_key;
  ELSIF _permission = 'operations.expenses.view' THEN
    _keys := _keys || 'expenses.view'::permission_key;
  ELSIF _permission = 'expenses.approve' THEN
    _keys := _keys || 'operations.expenses.approve'::permission_key;
  ELSIF _permission = 'operations.expenses.approve' THEN
    _keys := _keys || 'expenses.approve'::permission_key;

  -- Staff
  ELSIF _permission = 'staff.manage' THEN
    _keys := _keys || 'people.team.manage'::permission_key;
  ELSIF _permission = 'people.team.manage' THEN
    _keys := _keys || 'staff.manage'::permission_key;

  -- Settings
  ELSIF _permission = 'settings.manage' THEN
    _keys := _keys || 'settings.business.manage'::permission_key;
  ELSIF _permission = 'settings.business.manage' THEN
    _keys := _keys || 'settings.manage'::permission_key;

  -- Reports
  ELSIF _permission = 'reports.view.summary' THEN
    _keys := _keys || 'insights.reports.view'::permission_key;
  ELSIF _permission = 'insights.reports.view' THEN
    _keys := _keys || 'reports.view.summary'::permission_key;
  END IF;

  -- Check via role template in branch assignment
  IF EXISTS (
    SELECT 1
    FROM staff s
    INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
    INNER JOIN role_templates rt ON rt.id = sba.role_template_id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sba.branch_id = _branch_id
      AND sba.is_active = true
      AND (sba.expires_at IS NULL OR sba.expires_at > now())
      AND rt.permissions && _keys
  ) THEN
    RETURN true;
  END IF;

  -- Check individual staff_permissions (backward compat)
  IF EXISTS (
    SELECT 1
    FROM staff s
    INNER JOIN staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sp.permission = ANY(_keys)
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;
