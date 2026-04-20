-- =====================================================
-- CRITICAL SECURITY FIXES
-- =====================================================

-- 1. CRITICAL: Remove public invitation token viewing to prevent hijacking
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.staff_invitations;

-- 2. CRITICAL: Fix admin_access_logs INSERT to require user_id match
DROP POLICY IF EXISTS "System can insert access logs" ON public.admin_access_logs;
CREATE POLICY "Authenticated users log their own access" 
ON public.admin_access_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Clean up duplicate admin_profiles policies
DROP POLICY IF EXISTS "Super admins can insert admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can update admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can view admin profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.admin_profiles;

-- 4. Add user's own profile update capability
DROP POLICY IF EXISTS "Admins can view and update own profile" ON public.admin_profiles;
CREATE POLICY "Admins can update own profile" 
ON public.admin_profiles 
FOR UPDATE 
USING (user_id = auth.uid());

-- 5. Add index for invitation security lookups
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status 
ON public.staff_invitations(invitation_token, status) 
WHERE status = 'pending';