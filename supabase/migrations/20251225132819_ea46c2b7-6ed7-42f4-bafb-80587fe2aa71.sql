-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Business owners can create tickets" ON public.support_tickets;

-- Create better INSERT policy that validates business ownership
CREATE POLICY "Business users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  submitted_by_user_id = auth.uid()
  AND (
    business_id IS NULL 
    OR EXISTS (
      SELECT 1 FROM businesses WHERE id = business_id AND owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM staff WHERE business_id = support_tickets.business_id AND user_id = auth.uid() AND is_active = true
    )
  )
);

-- Also update SELECT policy to include staff
DROP POLICY IF EXISTS "Business owners can view their tickets" ON public.support_tickets;

CREATE POLICY "Business users can view their tickets"
ON public.support_tickets
FOR SELECT
USING (
  submitted_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM businesses WHERE id = business_id AND owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM staff WHERE business_id = support_tickets.business_id AND user_id = auth.uid() AND is_active = true
  )
);