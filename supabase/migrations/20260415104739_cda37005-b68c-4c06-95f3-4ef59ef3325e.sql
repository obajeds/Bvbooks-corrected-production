
-- Drop the overly permissive insert policy
DROP POLICY IF EXISTS "Authenticated users can insert error events" ON public.error_events;

-- Recreate with explicit auth check
CREATE POLICY "Authenticated users can insert error events"
  ON public.error_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
