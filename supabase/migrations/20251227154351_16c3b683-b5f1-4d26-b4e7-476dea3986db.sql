-- Add conversation_id to support_tickets to link tickets to chat conversations
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.support_conversations(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_support_tickets_conversation_id ON public.support_tickets(conversation_id);

-- Add ticket_id to support_conversations for reverse lookup (when ticket is created)
ALTER TABLE public.support_conversations 
ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- Add kb_articles_cited to track which KB articles were used in AI responses
ALTER TABLE public.support_chat_messages 
ADD COLUMN IF NOT EXISTS kb_article_ids UUID[] DEFAULT '{}';

-- Update conversation status enum to include 'ticket_created' as a valid state
-- First check current enum values and add if needed
DO $$ 
BEGIN
  -- Add ticket_created status if it doesn't exist
  ALTER TYPE conversation_status ADD VALUE IF NOT EXISTS 'ticket_created';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;