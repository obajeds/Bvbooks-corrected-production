-- Create staff invitations table
CREATE TABLE public.staff_invitations (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    invitation_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, expired, cancelled
    invited_by UUID REFERENCES auth.users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff branch assignments table (many-to-many with roles per branch)
CREATE TABLE public.staff_branch_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    role_template_id UUID REFERENCES public.role_templates(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE, -- for temporary access
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(staff_id, branch_id)
);

-- Create invitation branch assignments (branch + role assignments for pending invitations)
CREATE TABLE public.invitation_branch_assignments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invitation_id UUID NOT NULL REFERENCES public.staff_invitations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    role_template_id UUID REFERENCES public.role_templates(id),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE, -- for temporary access
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(invitation_id, branch_id)
);

-- Enable RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_branch_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitation_branch_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for staff_invitations
CREATE POLICY "Business owners can manage staff invitations"
ON public.staff_invitations
FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

-- Allow public access for accepting invitations (by token)
CREATE POLICY "Anyone can view invitation by token"
ON public.staff_invitations
FOR SELECT
USING (status = 'pending' AND expires_at > now());

-- RLS policies for staff_branch_assignments
CREATE POLICY "Business owners can manage staff branch assignments"
ON public.staff_branch_assignments
FOR ALL
USING (EXISTS (
    SELECT 1 FROM staff s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = staff_branch_assignments.staff_id
    AND b.owner_user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM staff s
    JOIN businesses b ON b.id = s.business_id
    WHERE s.id = staff_branch_assignments.staff_id
    AND b.owner_user_id = auth.uid()
));

-- Staff can view their own branch assignments
CREATE POLICY "Staff can view their own branch assignments"
ON public.staff_branch_assignments
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM staff s
    WHERE s.id = staff_branch_assignments.staff_id
    AND s.user_id = auth.uid()
));

-- RLS policies for invitation_branch_assignments
CREATE POLICY "Business owners can manage invitation branch assignments"
ON public.invitation_branch_assignments
FOR ALL
USING (EXISTS (
    SELECT 1 FROM staff_invitations si
    WHERE si.id = invitation_branch_assignments.invitation_id
    AND is_business_owner(si.business_id)
))
WITH CHECK (EXISTS (
    SELECT 1 FROM staff_invitations si
    WHERE si.id = invitation_branch_assignments.invitation_id
    AND is_business_owner(si.business_id)
));

-- Public can view invitation branch assignments for valid tokens
CREATE POLICY "Anyone can view invitation branch assignments for valid invitations"
ON public.invitation_branch_assignments
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM staff_invitations si
    WHERE si.id = invitation_branch_assignments.invitation_id
    AND si.status = 'pending'
    AND si.expires_at > now()
));

-- Create indexes for performance
CREATE INDEX idx_staff_invitations_token ON public.staff_invitations(invitation_token);
CREATE INDEX idx_staff_invitations_email ON public.staff_invitations(email);
CREATE INDEX idx_staff_invitations_business ON public.staff_invitations(business_id);
CREATE INDEX idx_staff_branch_assignments_staff ON public.staff_branch_assignments(staff_id);
CREATE INDEX idx_staff_branch_assignments_branch ON public.staff_branch_assignments(branch_id);

-- Update triggers
CREATE TRIGGER update_staff_invitations_updated_at
BEFORE UPDATE ON public.staff_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_staff_branch_assignments_updated_at
BEFORE UPDATE ON public.staff_branch_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();