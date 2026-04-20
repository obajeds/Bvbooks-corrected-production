-- Drop existing policies on support_messages
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Users can send messages to their tickets" ON public.support_messages;

-- Create updated SELECT policy that includes super admin access
CREATE POLICY "Users and admins can view messages"
ON public.support_messages
FOR SELECT
USING (
  -- Users can see messages for their own tickets
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND (
      t.submitted_by_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = t.business_id AND b.owner_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = t.business_id AND s.user_id = auth.uid() AND s.is_active = true)
    )
  )
  -- OR user is a super admin / support admin
  OR public.is_admin(auth.uid())
);

-- Create updated INSERT policy that includes super admin access
CREATE POLICY "Users and admins can send messages"
ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    -- Regular users can send to their own tickets
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.submitted_by_user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = t.business_id AND b.owner_user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = t.business_id AND s.user_id = auth.uid() AND s.is_active = true)
      )
    )
    -- OR user is a super admin / support admin
    OR public.is_admin(auth.uid())
  )
);

-- Also update support_tickets policy to allow admins to view all tickets
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their own tickets" ON public.support_tickets;

CREATE POLICY "Users and admins can view tickets"
ON public.support_tickets
FOR SELECT
USING (
  submitted_by_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = business_id AND s.user_id = auth.uid() AND s.is_active = true)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can create tickets"
ON public.support_tickets
FOR INSERT
WITH CHECK (
  submitted_by_user_id = auth.uid()
);

CREATE POLICY "Users and admins can update tickets"
ON public.support_tickets
FOR UPDATE
USING (
  submitted_by_user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = business_id AND b.owner_user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = business_id AND s.user_id = auth.uid() AND s.is_active = true)
  OR public.is_admin(auth.uid())
);