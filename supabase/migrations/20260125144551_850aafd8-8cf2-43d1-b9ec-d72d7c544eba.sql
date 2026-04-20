-- Add branch_id to business_addons for branch-scoped add-ons
ALTER TABLE public.business_addons 
ADD COLUMN branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL;

-- Create index for efficient queries
CREATE INDEX idx_business_addons_branch_id ON public.business_addons(branch_id);

-- Add comment for clarity
COMMENT ON COLUMN public.business_addons.branch_id IS 'The branch this add-on is scoped to. NULL means legacy/business-wide add-on.';

-- Create function to get branch staff capacity
CREATE OR REPLACE FUNCTION public.get_branch_staff_capacity(_branch_id uuid)
RETURNS TABLE (
  base_staff INTEGER,
  addon_staff INTEGER,
  total_capacity INTEGER,
  current_staff INTEGER
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id UUID;
  v_plan bvbooks_plan;
  v_base_ratio INTEGER;
  v_addon_staff INTEGER;
  v_current INTEGER;
  v_owner_user_id UUID;
BEGIN
  -- Get business and plan info
  SELECT b.business_id, bus.current_plan, bus.owner_user_id 
  INTO v_business_id, v_plan, v_owner_user_id
  FROM branches b
  JOIN businesses bus ON bus.id = b.business_id
  WHERE b.id = _branch_id;
  
  IF v_business_id IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0, 0;
    RETURN;
  END IF;
  
  -- Get base staff ratio for plan
  v_base_ratio := CASE v_plan
    WHEN 'free' THEN 2
    WHEN 'professional' THEN 3
    WHEN 'enterprise' THEN 5
    ELSE 2
  END;
  
  -- Get addon staff for this specific branch
  SELECT COALESCE(SUM(ba.quantity * 2), 0)::INTEGER INTO v_addon_staff
  FROM business_addons ba
  JOIN addon_features af ON af.id = ba.addon_feature_id
  WHERE ba.branch_id = _branch_id
    AND ba.status = 'active'
    AND af.feature_key = 'extra_branch';
  
  -- Count current staff in this branch (excluding owner)
  SELECT COUNT(*)::INTEGER INTO v_current
  FROM staff s
  JOIN staff_branch_assignments sba ON sba.staff_id = s.id
  WHERE sba.branch_id = _branch_id
    AND sba.is_active = true
    AND s.is_active = true
    AND s.role != 'owner'
    AND (v_owner_user_id IS NULL OR s.user_id != v_owner_user_id);
  
  RETURN QUERY SELECT 
    v_base_ratio as base_staff,
    v_addon_staff as addon_staff,
    (v_base_ratio + v_addon_staff) as total_capacity,
    v_current as current_staff;
END;
$$;

-- Create function to check if staff can be added to a branch
CREATE OR REPLACE FUNCTION public.can_add_staff_to_branch(_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (SELECT current_staff < total_capacity FROM get_branch_staff_capacity(_branch_id))
$$;

-- Update the get_plan_staff_limit function to support branch-scoped calculation
CREATE OR REPLACE FUNCTION public.get_plan_staff_limit_for_branch(_business_id uuid, _branch_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  SELECT * INTO v_result FROM get_branch_staff_capacity(_branch_id);
  RETURN v_result.total_capacity;
END;
$$;