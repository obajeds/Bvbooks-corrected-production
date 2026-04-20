-- Create function to get staff's accessible branches with their roles
CREATE OR REPLACE FUNCTION public.get_staff_accessible_branches(_user_id uuid)
RETURNS TABLE(
  branch_id uuid,
  branch_name text,
  role_template_id uuid,
  role_name text,
  permissions permission_key[],
  is_primary boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sba.branch_id,
    b.name as branch_name,
    sba.role_template_id,
    rt.name as role_name,
    COALESCE(rt.permissions, '{}') as permissions,
    sba.is_primary,
    sba.expires_at
  FROM staff s
  INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
  INNER JOIN branches b ON b.id = sba.branch_id
  LEFT JOIN role_templates rt ON rt.id = sba.role_template_id
  WHERE s.user_id = _user_id
    AND s.is_active = true
    AND sba.is_active = true
    AND b.is_active = true
    AND (sba.expires_at IS NULL OR sba.expires_at > now())
$$;

-- Create function to check if user has permission in a specific branch
CREATE OR REPLACE FUNCTION public.has_branch_permission(
  _user_id uuid, 
  _branch_id uuid, 
  _permission permission_key
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is business owner (has all permissions in all branches)
    SELECT 1 FROM businesses b
    INNER JOIN branches br ON br.business_id = b.id
    WHERE b.owner_user_id = _user_id
      AND br.id = _branch_id
  ) OR EXISTS (
    -- Check if staff has the permission via role template in that specific branch
    SELECT 1
    FROM staff s
    INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
    INNER JOIN role_templates rt ON rt.id = sba.role_template_id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sba.branch_id = _branch_id
      AND sba.is_active = true
      AND (sba.expires_at IS NULL OR sba.expires_at > now())
      AND _permission = ANY(rt.permissions)
  ) OR EXISTS (
    -- Also check individual staff_permissions (not branch-scoped for backward compat)
    SELECT 1
    FROM staff s
    INNER JOIN staff_permissions sp ON sp.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sp.permission = _permission
      AND (sp.expires_at IS NULL OR sp.expires_at > now())
  )
$$;

-- Create function to check if user can access a branch at all
CREATE OR REPLACE FUNCTION public.can_access_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if user is business owner (has access to all branches)
    SELECT 1 FROM businesses b
    INNER JOIN branches br ON br.business_id = b.id
    WHERE b.owner_user_id = _user_id
      AND br.id = _branch_id
  ) OR EXISTS (
    -- Check if staff has an active assignment to that branch
    SELECT 1
    FROM staff s
    INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
    WHERE s.user_id = _user_id
      AND s.is_active = true
      AND sba.branch_id = _branch_id
      AND sba.is_active = true
      AND (sba.expires_at IS NULL OR sba.expires_at > now())
  )
$$;

-- Create function to get branch-scoped permissions for a user
CREATE OR REPLACE FUNCTION public.get_branch_permissions(_user_id uuid, _branch_id uuid)
RETURNS permission_key[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- If business owner, return all permissions
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM businesses b
      INNER JOIN branches br ON br.business_id = b.id
      WHERE b.owner_user_id = _user_id AND br.id = _branch_id
    ) THEN (
      SELECT array_agg(DISTINCT e::permission_key) 
      FROM unnest(enum_range(NULL::permission_key)) AS e
    )
    ELSE (
      -- Get permissions from role template assigned to that branch
      SELECT COALESCE(
        (SELECT rt.permissions 
         FROM staff s
         INNER JOIN staff_branch_assignments sba ON sba.staff_id = s.id
         INNER JOIN role_templates rt ON rt.id = sba.role_template_id
         WHERE s.user_id = _user_id
           AND s.is_active = true
           AND sba.branch_id = _branch_id
           AND sba.is_active = true
           AND (sba.expires_at IS NULL OR sba.expires_at > now())
         LIMIT 1),
        '{}'::permission_key[]
      )
    )
  END
$$;

-- Create audit log for branch-related actions
CREATE TABLE IF NOT EXISTS public.branch_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  action text NOT NULL, -- 'login', 'switch_branch', 'access_denied', 'logout'
  previous_branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on branch_access_logs
ALTER TABLE public.branch_access_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for branch_access_logs
CREATE POLICY "Business owners can view branch access logs"
ON public.branch_access_logs
FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "Business owners can insert branch access logs"
ON public.branch_access_logs
FOR INSERT
WITH CHECK (is_business_owner(business_id) OR EXISTS (
  SELECT 1 FROM staff s
  WHERE s.user_id = auth.uid()
    AND s.business_id = branch_access_logs.business_id
    AND s.is_active = true
));

-- Staff should not be able to update or delete access logs
-- No UPDATE or DELETE policies = immutable audit log

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_branch_access_logs_business_created 
ON public.branch_access_logs(business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_access_logs_user 
ON public.branch_access_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_branch_access_logs_branch 
ON public.branch_access_logs(branch_id, created_at DESC);