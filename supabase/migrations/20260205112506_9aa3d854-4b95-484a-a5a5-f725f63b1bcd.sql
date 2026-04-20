-- Fix PUBLIC_DATA_EXPOSURE vulnerabilities by removing SELECT policies that target the 'public' role
-- These policies allow anonymous users to read sensitive data

-- ==========================================
-- 1. admin_profiles - Remove public SELECT policies (keep authenticated-only policies)
-- ==========================================
DROP POLICY IF EXISTS "Super admins view all profiles" ON public.admin_profiles;
DROP POLICY IF EXISTS "Users view own profile" ON public.admin_profiles;

-- ==========================================
-- 2. brms - Remove public SELECT policies (keep authenticated-only policies)
-- ==========================================
DROP POLICY IF EXISTS "BRM access control" ON public.brms;
DROP POLICY IF EXISTS "BRMs can view their own record" ON public.brms;
DROP POLICY IF EXISTS "Business owners can view their assigned BRM" ON public.brms;
DROP POLICY IF EXISTS "Support admin can view BRMs" ON public.brms;

-- ==========================================
-- 3. subscriptions - Remove public SELECT policies (secure policy already exists)
-- ==========================================
DROP POLICY IF EXISTS "Admins can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Business owners can view their subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Finance admins can view subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscription access control" ON public.subscriptions;