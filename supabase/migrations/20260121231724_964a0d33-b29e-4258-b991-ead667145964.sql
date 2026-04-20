-- Add RLS policy to allow reading system role templates (where business_id is NULL)
-- This allows all authenticated users to read the default system role templates

CREATE POLICY "Users can read system role templates"
ON public.role_templates
FOR SELECT
USING (
  business_id IS NULL AND is_system = true
);

-- Also ensure business owners and staff can read their business role templates
CREATE POLICY "Business users can read their role templates"
ON public.role_templates
FOR SELECT
USING (
  business_id IS NOT NULL AND (
    business_id = get_user_accessible_business_id()
  )
);