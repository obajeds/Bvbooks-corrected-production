-- Drop the constraint that prevents admins from approving their own requests
ALTER TABLE public.approval_requests
DROP CONSTRAINT IF EXISTS check_requester_not_approver;