-- Add branch_id column to activity_logs for branch-scoped activity filtering
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES public.branches(id);

-- Create index for efficient branch-scoped queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id ON public.activity_logs(branch_id);
