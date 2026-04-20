-- Add new permission keys to the enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'settings.rewards.manage';
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'approval.discount.stop';

-- Create active_discounts table for persistent approved discounts
CREATE TABLE public.active_discounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  discount_percent NUMERIC NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  reason TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES public.staff(id),
  approval_request_id UUID REFERENCES public.approval_requests(id),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  stopped_at TIMESTAMP WITH TIME ZONE,
  stopped_by UUID REFERENCES public.staff(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.active_discounts ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for active_discounts
CREATE POLICY "Users can view active discounts for their business"
ON public.active_discounts
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM staff WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Owners and admins can insert active discounts"
ON public.active_discounts
FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager')
  )
);

CREATE POLICY "Owners and admins can update active discounts"
ON public.active_discounts
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('admin', 'manager')
  )
);

-- Create index for quick lookups
CREATE INDEX idx_active_discounts_business_active ON public.active_discounts(business_id, is_active) WHERE is_active = true;
CREATE INDEX idx_active_discounts_branch ON public.active_discounts(branch_id) WHERE branch_id IS NOT NULL;