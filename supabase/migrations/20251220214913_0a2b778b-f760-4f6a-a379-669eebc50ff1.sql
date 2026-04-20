-- Create permission key enum type for granular permissions
CREATE TYPE public.permission_key AS ENUM (
  -- POS permissions
  'pos.access',
  'pos.sale.create',
  'pos.sale.cancel',
  'pos.sale.refund',
  'pos.discount.apply',
  'pos.discount.override',
  
  -- Inventory permissions
  'inventory.view',
  'inventory.item.create',
  'inventory.item.edit',
  'inventory.item.delete',
  'inventory.adjust.create',
  'inventory.adjust.approve',
  'inventory.price.view_cost',
  'inventory.price.edit',
  
  -- Sales permissions
  'sales.view',
  'sales.view.all',
  'sales.edit',
  'sales.delete',
  
  -- Reports permissions
  'reports.view.summary',
  'reports.view.financial',
  'reports.view.inventory',
  'reports.export',
  
  -- Staff permissions
  'staff.view',
  'staff.manage',
  'staff.suspend',
  'staff.permissions.manage',
  
  -- Customer permissions
  'crm.view',
  'crm.manage',
  'crm.credit.manage',
  
  -- Expenses permissions
  'expenses.view',
  'expenses.create',
  'expenses.approve',
  
  -- Accounting permissions
  'accounting.view',
  'accounting.manage',
  
  -- Settings permissions
  'settings.view',
  'settings.manage',
  'settings.branches.manage',
  
  -- Audit permissions
  'audit.view',
  
  -- Approval permissions
  'approval.refund',
  'approval.stock_adjustment',
  'approval.discount'
);

-- Create staff_permissions table for granular permission assignments
CREATE TABLE public.staff_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  permission permission_key NOT NULL,
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(staff_id, permission)
);

-- Create permission_audit_logs table for tracking permission changes
CREATE TABLE public.permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'grant', 'revoke', 'role_change', 'suspend', 'reactivate'
  permission permission_key,
  old_role TEXT,
  new_role TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create approval_requests table for workflow approvals
CREATE TABLE public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL, -- 'refund', 'stock_adjustment', 'discount'
  requested_by UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.staff(id),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  amount NUMERIC,
  threshold_amount NUMERIC,
  reference_id UUID, -- References the related entity (sale_id, stock_movement_id, etc.)
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT check_requester_not_approver CHECK (requested_by != approved_by)
);

-- Create role_templates table for predefined role permission sets
CREATE TABLE public.role_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  permissions permission_key[] NOT NULL DEFAULT '{}',
  is_system BOOLEAN NOT NULL DEFAULT false, -- System roles cannot be deleted
  is_active BOOLEAN NOT NULL DEFAULT true,
  discount_limit NUMERIC DEFAULT 0, -- Max discount percentage this role can apply
  refund_limit NUMERIC DEFAULT 0, -- Max refund amount without approval
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_staff_permissions_staff_id ON public.staff_permissions(staff_id);
CREATE INDEX idx_staff_permissions_permission ON public.staff_permissions(permission);
CREATE INDEX idx_permission_audit_logs_business_id ON public.permission_audit_logs(business_id);
CREATE INDEX idx_permission_audit_logs_staff_id ON public.permission_audit_logs(staff_id);
CREATE INDEX idx_permission_audit_logs_created_at ON public.permission_audit_logs(created_at DESC);
CREATE INDEX idx_approval_requests_business_id ON public.approval_requests(business_id);
CREATE INDEX idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX idx_role_templates_business_id ON public.role_templates(business_id);

-- Enable RLS on all new tables
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_templates ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _permission permission_key)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is business owner (has all permissions)
    SELECT 1 FROM businesses WHERE owner_user_id = _user_id
  ) OR EXISTS (
    -- Check if staff has the specific permission
    SELECT 1
    FROM staff s
    INNER JOIN staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sp.permission = _permission
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  )
$$;

-- Create function to check if user is business owner or has specific permission
CREATE OR REPLACE FUNCTION public.can_access(_business_id UUID, _permission permission_key)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_business_owner(_business_id) 
    OR public.has_permission(auth.uid(), _permission)
$$;

-- Create function to get all permissions for a staff member
CREATE OR REPLACE FUNCTION public.get_staff_permissions(_staff_id UUID)
RETURNS permission_key[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(permission), '{}')
  FROM staff_permissions
  WHERE staff_id = _staff_id
    AND (expires_at IS NULL OR expires_at > now())
$$;

-- Create function to grant permission to staff
CREATE OR REPLACE FUNCTION public.grant_permission(_staff_id UUID, _permission permission_key, _granted_by UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO staff_permissions (staff_id, permission, granted_by)
  VALUES (_staff_id, _permission, COALESCE(_granted_by, auth.uid()))
  ON CONFLICT (staff_id, permission) DO NOTHING;
END;
$$;

-- Create function to revoke permission from staff
CREATE OR REPLACE FUNCTION public.revoke_permission(_staff_id UUID, _permission permission_key)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM staff_permissions
  WHERE staff_id = _staff_id AND permission = _permission;
END;
$$;

-- Create function to bulk set permissions for a staff member (replaces all permissions)
CREATE OR REPLACE FUNCTION public.set_staff_permissions(_staff_id UUID, _permissions permission_key[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing permissions
  DELETE FROM staff_permissions WHERE staff_id = _staff_id;
  
  -- Insert new permissions
  INSERT INTO staff_permissions (staff_id, permission, granted_by)
  SELECT _staff_id, unnest(_permissions), auth.uid();
END;
$$;

-- RLS Policies for staff_permissions
CREATE POLICY "Business owners can manage staff permissions"
ON public.staff_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM staff s
    INNER JOIN businesses b ON b.id = s.business_id
    WHERE s.id = staff_id AND b.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM staff s
    INNER JOIN businesses b ON b.id = s.business_id
    WHERE s.id = staff_id AND b.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Staff can view their own permissions"
ON public.staff_permissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_id AND s.user_id = auth.uid()
  )
);

-- RLS Policies for permission_audit_logs
CREATE POLICY "Business owners can view permission audit logs"
ON public.permission_audit_logs
FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "Business owners can insert permission audit logs"
ON public.permission_audit_logs
FOR INSERT
WITH CHECK (is_business_owner(business_id));

-- RLS Policies for approval_requests
CREATE POLICY "Business owners can manage approval requests"
ON public.approval_requests
FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Staff can view their own approval requests"
ON public.approval_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = requested_by AND s.user_id = auth.uid()
  )
);

CREATE POLICY "Staff with approval permission can approve requests"
ON public.approval_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM staff s
    INNER JOIN businesses b ON b.id = s.business_id
    WHERE s.user_id = auth.uid()
      AND s.is_active = true
      AND b.id = business_id
      AND (
        b.owner_user_id = auth.uid()
        OR public.has_permission(auth.uid(), 'approval.refund'::permission_key)
        OR public.has_permission(auth.uid(), 'approval.stock_adjustment'::permission_key)
        OR public.has_permission(auth.uid(), 'approval.discount'::permission_key)
      )
  )
);

-- RLS Policies for role_templates
CREATE POLICY "Business owners can manage role templates"
ON public.role_templates
FOR ALL
USING (business_id IS NULL OR is_business_owner(business_id))
WITH CHECK (business_id IS NULL OR is_business_owner(business_id));

CREATE POLICY "Anyone can view system role templates"
ON public.role_templates
FOR SELECT
USING (is_system = true);

-- Insert default system role templates
INSERT INTO public.role_templates (name, description, permissions, is_system, discount_limit, refund_limit) VALUES
(
  'Sales Staff',
  'Can only access POS and customer lookup. Cannot see cost price, profit, or inventory valuation.',
  ARRAY['pos.access', 'pos.sale.create', 'crm.view', 'sales.view']::permission_key[],
  true,
  5, -- 5% max discount
  0  -- No refunds without approval
),
(
  'Inventory Officer',
  'Can create stock movements but never approve them. Cannot see sales revenue or pricing.',
  ARRAY['inventory.view', 'inventory.item.create', 'inventory.item.edit', 'inventory.adjust.create']::permission_key[],
  true,
  0,
  0
),
(
  'Manager',
  'Can view performance reports and approve discounts/refunds within limits. Cannot manage staff or settings.',
  ARRAY['pos.access', 'pos.sale.create', 'pos.sale.cancel', 'pos.sale.refund', 'pos.discount.apply', 'inventory.view', 'sales.view', 'sales.view.all', 'reports.view.summary', 'crm.view', 'crm.manage', 'expenses.view', 'approval.refund', 'approval.discount']::permission_key[],
  true,
  15, -- 15% max discount
  50000 -- Up to 50,000 refund without owner approval
),
(
  'Accountant',
  'Read-only access to all financial data. Cannot perform operational actions.',
  ARRAY['sales.view', 'sales.view.all', 'reports.view.summary', 'reports.view.financial', 'reports.view.inventory', 'reports.export', 'expenses.view', 'accounting.view', 'inventory.price.view_cost', 'audit.view']::permission_key[],
  true,
  0,
  0
);

-- Add trigger to update role_templates updated_at
CREATE TRIGGER update_role_templates_updated_at
BEFORE UPDATE ON public.role_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();