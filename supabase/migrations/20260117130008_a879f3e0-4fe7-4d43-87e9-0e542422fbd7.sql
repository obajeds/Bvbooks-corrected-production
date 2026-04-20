-- Clear all existing password reset requirements since they were created before the UPDATE policy existed
-- Users can be re-flagged if needed with proper workflow
UPDATE public.password_reset_required 
SET resolved_at = now() 
WHERE resolved_at IS NULL;