
-- Fix: categories SELECT policy excludes business owners
-- Drop the staff-only SELECT policy and replace with one that includes owners

DROP POLICY IF EXISTS "Staff with inventory.view can view categories" ON public.categories;

CREATE POLICY "Business members can view categories"
ON public.categories
FOR SELECT
USING (
  is_business_owner(business_id)
  OR EXISTS (
    SELECT 1 FROM staff s
    WHERE s.business_id = categories.business_id
      AND s.user_id = auth.uid()
      AND s.is_active = true
  )
);
