
-- Set REPLICA IDENTITY FULL for better Realtime support
ALTER TABLE public.platform_features REPLICA IDENTITY FULL;

-- Ensure the table is in the Realtime publication (it should already be, but let's confirm)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND schemaname = 'public' 
    AND tablename = 'platform_features'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_features;
  END IF;
END $$;

-- Add a comment for documentation
COMMENT ON TABLE public.platform_features IS 'Super Admin controlled platform-wide feature toggles. Changes sync in real-time to all Client Admin instances.';
