-- Fix function search path for grant_permission
CREATE OR REPLACE FUNCTION public.grant_permission(_staff_id UUID, _permission permission_key, _granted_by UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff_permissions (staff_id, permission, granted_by)
  VALUES (_staff_id, _permission, COALESCE(_granted_by, auth.uid()))
  ON CONFLICT (staff_id, permission) DO NOTHING;
END;
$$;

-- Fix function search path for revoke_permission
CREATE OR REPLACE FUNCTION public.revoke_permission(_staff_id UUID, _permission permission_key)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.staff_permissions
  WHERE staff_id = _staff_id AND permission = _permission;
END;
$$;

-- Fix function search path for set_staff_permissions
CREATE OR REPLACE FUNCTION public.set_staff_permissions(_staff_id UUID, _permissions permission_key[])
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete existing permissions
  DELETE FROM public.staff_permissions WHERE staff_id = _staff_id;
  
  -- Insert new permissions
  INSERT INTO public.staff_permissions (staff_id, permission, granted_by)
  SELECT _staff_id, unnest(_permissions), auth.uid();
END;
$$;