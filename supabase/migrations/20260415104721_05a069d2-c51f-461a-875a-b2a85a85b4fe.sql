
-- Create error_events table for centralized error logging
CREATE TABLE public.error_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'client' CHECK (source IN ('client', 'edge_function', 'database')),
  severity TEXT NOT NULL DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX idx_error_events_business_id ON public.error_events(business_id);
CREATE INDEX idx_error_events_severity ON public.error_events(severity);
CREATE INDEX idx_error_events_created_at ON public.error_events(created_at DESC);
CREATE INDEX idx_error_events_source ON public.error_events(source);

-- Enable RLS
ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

-- Super admins can see all error events
CREATE POLICY "Super admins can view all error events"
  ON public.error_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Business owners can view their own error events
CREATE POLICY "Business owners can view own error events"
  ON public.error_events FOR SELECT
  TO authenticated
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_user_id = auth.uid())
  );

-- Authenticated users can insert error events (for client-side logging)
CREATE POLICY "Authenticated users can insert error events"
  ON public.error_events FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Super admins can update (resolve) error events
CREATE POLICY "Super admins can update error events"
  ON public.error_events FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );

-- Create alert_rules table
CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('error_rate', 'slow_query', 'failed_transaction')),
  threshold INTEGER NOT NULL DEFAULT 10,
  window_minutes INTEGER NOT NULL DEFAULT 5,
  notify_channel TEXT NOT NULL DEFAULT 'in_app' CHECK (notify_channel IN ('in_app', 'email')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

-- Only super admins manage alert rules
CREATE POLICY "Super admins can manage alert rules"
  ON public.alert_rules FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.admin_roles WHERE user_id = auth.uid())
  );
