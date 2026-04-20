-- =============================================
-- SECURITY FIX: Add authorization to permission functions
-- =============================================

-- Drop and recreate grant_permission with authorization check
CREATE OR REPLACE FUNCTION public.grant_permission(_staff_id uuid, _permission permission_key, _granted_by uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_is_owner boolean;
BEGIN
  -- Get the business_id for this staff member
  SELECT business_id INTO v_business_id
  FROM staff
  WHERE id = _staff_id;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;
  
  -- Check if caller is the business owner
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = v_business_id
    AND owner_user_id = auth.uid()
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Access denied: only business owner can grant permissions';
  END IF;
  
  -- Now safe to grant permission
  INSERT INTO staff_permissions (staff_id, permission, granted_by)
  VALUES (_staff_id, _permission, COALESCE(_granted_by, auth.uid()))
  ON CONFLICT (staff_id, permission) DO NOTHING;
END;
$$;

-- Drop and recreate revoke_permission with authorization check
CREATE OR REPLACE FUNCTION public.revoke_permission(_staff_id uuid, _permission permission_key)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_is_owner boolean;
BEGIN
  -- Get the business_id for this staff member
  SELECT business_id INTO v_business_id
  FROM staff
  WHERE id = _staff_id;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;
  
  -- Check if caller is the business owner
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = v_business_id
    AND owner_user_id = auth.uid()
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Access denied: only business owner can revoke permissions';
  END IF;
  
  DELETE FROM staff_permissions
  WHERE staff_id = _staff_id AND permission = _permission;
END;
$$;

-- Drop and recreate set_staff_permissions with authorization check
CREATE OR REPLACE FUNCTION public.set_staff_permissions(_staff_id uuid, _permissions permission_key[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_is_owner boolean;
BEGIN
  -- Get the business_id for this staff member
  SELECT business_id INTO v_business_id
  FROM staff
  WHERE id = _staff_id;
  
  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'Staff member not found';
  END IF;
  
  -- Check if caller is the business owner
  SELECT EXISTS (
    SELECT 1 FROM businesses
    WHERE id = v_business_id
    AND owner_user_id = auth.uid()
  ) INTO v_is_owner;
  
  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'Access denied: only business owner can set permissions';
  END IF;
  
  -- Delete existing permissions
  DELETE FROM staff_permissions WHERE staff_id = _staff_id;
  
  -- Insert new permissions
  INSERT INTO staff_permissions (staff_id, permission, granted_by)
  SELECT _staff_id, unnest(_permissions), auth.uid();
END;
$$;

-- =============================================
-- SECURITY FIX: Ensure admin_profiles RLS prevents public access
-- =============================================

-- Drop any existing policies that might allow public read
DROP POLICY IF EXISTS "Public can view admin profiles" ON admin_profiles;
DROP POLICY IF EXISTS "Anyone can view admin profiles" ON admin_profiles;

-- Create restrictive policies for admin_profiles (super admins only)
DROP POLICY IF EXISTS "Super admins can view admin profiles" ON admin_profiles;
CREATE POLICY "Super admins can view admin profiles"
  ON admin_profiles FOR SELECT
  USING (
    is_super_admin_domain(auth.uid()) OR 
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Super admins can update admin profiles" ON admin_profiles;
CREATE POLICY "Super admins can update admin profiles"
  ON admin_profiles FOR UPDATE
  USING (
    is_super_admin_domain(auth.uid()) OR 
    user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Super admins can insert admin profiles" ON admin_profiles;
CREATE POLICY "Super admins can insert admin profiles"
  ON admin_profiles FOR INSERT
  WITH CHECK (
    is_super_admin_domain(auth.uid()) OR 
    user_id = auth.uid()
  );

-- =============================================
-- SECURITY FIX: Ensure businesses table RLS prevents unauthorized access
-- =============================================

-- Drop any overly permissive policies
DROP POLICY IF EXISTS "Public can view businesses" ON businesses;
DROP POLICY IF EXISTS "Anyone can view businesses" ON businesses;

-- Ensure only owners, staff, and super admins can view business data
DROP POLICY IF EXISTS "Business owners can view their business" ON businesses;
CREATE POLICY "Business owners can view their business"
  ON businesses FOR SELECT
  USING (
    owner_user_id = auth.uid() OR
    is_staff_of_business(id) OR
    is_super_admin_domain(auth.uid())
  );

DROP POLICY IF EXISTS "Business owners can update their business" ON businesses;
CREATE POLICY "Business owners can update their business"
  ON businesses FOR UPDATE
  USING (
    owner_user_id = auth.uid() OR
    is_super_admin_domain(auth.uid())
  );

DROP POLICY IF EXISTS "Authenticated users can create business" ON businesses;
CREATE POLICY "Authenticated users can create business"
  ON businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);