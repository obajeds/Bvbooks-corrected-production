-- Add UPDATE policy so users can mark their password reset as resolved
CREATE POLICY "Users can update their own password reset resolved_at"
ON public.password_reset_required
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);