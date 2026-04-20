-- Create support messages table for chat messages
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'support', 'system')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Policies for support_messages
CREATE POLICY "Users can view messages for their tickets" 
ON public.support_messages 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.support_tickets t 
  WHERE t.id = ticket_id AND t.submitted_by_user_id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM public.support_tickets t 
  WHERE t.id = ticket_id AND is_business_owner(t.business_id)
));

CREATE POLICY "Users can send messages to their tickets" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.support_tickets t 
  WHERE t.id = ticket_id AND t.submitted_by_user_id = auth.uid()
) OR EXISTS (
  SELECT 1 FROM public.support_tickets t 
  WHERE t.id = ticket_id AND is_business_owner(t.business_id)
));

-- Enable realtime for support messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

-- Index for performance
CREATE INDEX idx_support_messages_ticket ON public.support_messages(ticket_id);