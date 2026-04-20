-- Fix the INSERT policy to allow admins to send messages
-- The current policy requires sender_id = auth.uid() for EVERYONE, 
-- but admins should be able to send messages as support agents

DROP POLICY IF EXISTS "Users and admins can send messages" ON support_messages;

CREATE POLICY "Users and admins can send messages"
ON support_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() 
  AND (
    -- Regular users/staff can send to tickets they have access to
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = support_messages.ticket_id
      AND (
        t.submitted_by_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM businesses b
          WHERE b.id = t.business_id AND b.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM staff s
          WHERE s.business_id = t.business_id 
          AND s.user_id = auth.uid() 
          AND s.is_active = true
        )
      )
    )
    -- OR user is a super admin (can send to ANY ticket)
    OR is_admin(auth.uid())
  )
);