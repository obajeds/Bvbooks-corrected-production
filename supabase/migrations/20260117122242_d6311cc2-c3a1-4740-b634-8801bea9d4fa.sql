-- Create a table to track users who need to reset their weak passwords
CREATE TABLE IF NOT EXISTS public.password_reset_required (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  reason TEXT DEFAULT 'weak_password',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.password_reset_required ENABLE ROW LEVEL SECURITY;

-- Users can only see their own password reset requirement
CREATE POLICY "Users can view their own password reset requirement"
ON public.password_reset_required
FOR SELECT
USING (auth.uid() = user_id);

-- Only service role can insert/update (will be done via edge function or admin)
CREATE POLICY "Service role can manage password reset requirements"
ON public.password_reset_required
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Create index for fast lookups
CREATE INDEX idx_password_reset_required_user_id ON public.password_reset_required(user_id);
CREATE INDEX idx_password_reset_required_unresolved ON public.password_reset_required(user_id) WHERE resolved_at IS NULL;