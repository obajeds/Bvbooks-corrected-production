-- Drop existing support_messages policies and create more permissive ones
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON public.support_messages;
DROP POLICY IF EXISTS "Users can send messages to their tickets" ON public.support_messages;

-- Create SELECT policy that includes staff
CREATE POLICY "Users can view messages for their tickets"
ON public.support_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND (
      t.submitted_by_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = t.business_id AND b.owner_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = t.business_id AND s.user_id = auth.uid() AND s.is_active = true)
    )
  )
);

-- Create INSERT policy that includes staff
CREATE POLICY "Users can send messages to their tickets"
ON public.support_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM support_tickets t
    WHERE t.id = support_messages.ticket_id
    AND (
      t.submitted_by_user_id = auth.uid()
      OR EXISTS (SELECT 1 FROM businesses b WHERE b.id = t.business_id AND b.owner_user_id = auth.uid())
      OR EXISTS (SELECT 1 FROM staff s WHERE s.business_id = t.business_id AND s.user_id = auth.uid() AND s.is_active = true)
    )
  )
);