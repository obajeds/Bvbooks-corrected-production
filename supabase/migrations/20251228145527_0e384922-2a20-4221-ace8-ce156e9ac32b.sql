-- Fix notification_audit_logs RLS policy to prevent unrestricted inserts
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "System can insert audit logs" ON notification_audit_logs;

-- Create new policy that only allows service role to insert (edge functions use service role)
-- This prevents regular authenticated users from inserting fake audit logs
CREATE POLICY "Service role can insert audit logs" 
  ON notification_audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Add comment explaining the security rationale
COMMENT ON POLICY "Service role can insert audit logs" ON notification_audit_logs IS 
  'Audit logs should only be inserted by server-side code (edge functions) using service role to maintain audit trail integrity';