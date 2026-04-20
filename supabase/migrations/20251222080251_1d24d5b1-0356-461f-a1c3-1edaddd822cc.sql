-- Drop existing policies on role_templates
DROP POLICY IF EXISTS "Anyone can view system role templates" ON public.role_templates;
DROP POLICY IF EXISTS "Business owners can manage role templates" ON public.role_templates;

-- Create comprehensive RLS policies for role_templates

-- Allow viewing role templates (system ones or business-specific ones)
CREATE POLICY "Users can view role templates" 
ON public.role_templates 
FOR SELECT 
USING (
  -- System templates are viewable by everyone
  is_system = true 
  OR 
  -- Business templates are viewable by business owners
  is_business_owner(business_id)
  OR
  -- Business templates are viewable by staff of that business
  (business_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM staff s
    WHERE s.business_id = role_templates.business_id
    AND s.user_id = auth.uid()
    AND s.is_active = true
  ))
);

-- Business owners can create role templates
CREATE POLICY "Business owners can create role templates" 
ON public.role_templates 
FOR INSERT 
WITH CHECK (is_business_owner(business_id));

-- Business owners can update their role templates
CREATE POLICY "Business owners can update role templates" 
ON public.role_templates 
FOR UPDATE 
USING (is_business_owner(business_id));

-- Business owners can delete their role templates (non-system only)
CREATE POLICY "Business owners can delete role templates" 
ON public.role_templates 
FOR DELETE 
USING (is_business_owner(business_id) AND is_system = false);