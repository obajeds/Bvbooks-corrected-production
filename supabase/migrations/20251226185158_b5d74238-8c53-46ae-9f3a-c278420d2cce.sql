-- Enable realtime for support tables
DO $$ 
BEGIN
  -- Add tables to realtime publication if not already added
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'support_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_chat_messages;
  END IF;
END $$;

-- Set replica identity for realtime to work properly
ALTER TABLE public.support_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.support_chat_messages REPLICA IDENTITY FULL;