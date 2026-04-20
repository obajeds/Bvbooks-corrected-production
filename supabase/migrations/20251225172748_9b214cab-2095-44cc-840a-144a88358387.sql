-- Create notification types enum
CREATE TYPE public.notification_type_key AS ENUM (
  'low_stock_alert',
  'daily_sales_summary',
  'weekly_sales_report',
  'new_sale_notification',
  'approval_request',
  'approval_resolved',
  'after_hours_alert',
  'system_announcement'
);

-- Create notification channel enum
CREATE TYPE public.notification_channel AS ENUM (
  'in_app',
  'email',
  'push'
);

-- Create notification delivery status enum
CREATE TYPE public.notification_delivery_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'retrying'
);

-- User notification preferences (per user, per notification type, branch-scoped)
CREATE TABLE public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  notification_type public.notification_type_key NOT NULL,
  
  -- Channel settings
  in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  push_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Scope
  branch_ids UUID[] DEFAULT NULL, -- NULL = all branches, specific UUIDs = filtered
  
  -- Type-specific settings (JSONB for flexibility)
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- e.g., for daily_sales: { "delivery_time": "23:59", "skip_zero_days": false }
  -- e.g., for weekly: { "delivery_day": "monday", "delivery_time": "08:00" }
  -- e.g., for low_stock: { "threshold_override": 10 }
  
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, business_id, notification_type)
);

-- Platform default notification settings (super admin controlled)
CREATE TABLE public.notification_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type public.notification_type_key NOT NULL UNIQUE,
  
  -- Default channel settings for new users
  default_in_app_enabled BOOLEAN NOT NULL DEFAULT true,
  default_email_enabled BOOLEAN NOT NULL DEFAULT false,
  default_push_enabled BOOLEAN NOT NULL DEFAULT false,
  
  -- Platform controls
  is_available BOOLEAN NOT NULL DEFAULT true, -- Super admin can disable platform-wide
  is_critical BOOLEAN NOT NULL DEFAULT false, -- Critical alerts cannot be disabled by users
  is_enforced BOOLEAN NOT NULL DEFAULT false, -- Enforced notifications ignore user preferences
  
  -- Default settings template
  default_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Applicable roles (NULL = all roles)
  applicable_roles TEXT[] DEFAULT NULL,
  
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification events queue (event-driven triggers)
CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  notification_type public.notification_type_key NOT NULL,
  
  -- Event data
  event_source TEXT NOT NULL, -- 'pos_sale', 'stock_adjustment', 'inventory_import', 'scheduled', etc.
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Deduplication
  dedup_key TEXT, -- Unique key for deduplication (e.g., 'low_stock_{product_id}_{branch_id}')
  dedup_expires_at TIMESTAMPTZ, -- When dedup key expires
  
  -- Processing state
  status public.notification_delivery_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  
  -- Error tracking
  last_error TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification delivery log (audit trail)
CREATE TABLE public.notification_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  notification_type public.notification_type_key NOT NULL,
  channel public.notification_channel NOT NULL,
  
  -- Recipient info
  recipient_user_id UUID,
  recipient_email TEXT,
  recipient_role TEXT,
  
  -- Trigger info
  trigger_source TEXT NOT NULL,
  event_id UUID REFERENCES public.notification_events(id) ON DELETE SET NULL,
  
  -- Delivery status
  status public.notification_delivery_status NOT NULL,
  
  -- Content (for audit/debugging)
  subject TEXT,
  content_preview TEXT,
  
  -- Timing
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Error details
  error_message TEXT,
  error_code TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Low stock alert tracking (for deduplication)
CREATE TABLE public.low_stock_alert_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Current state
  is_below_threshold BOOLEAN NOT NULL DEFAULT false,
  last_alert_sent_at TIMESTAMPTZ,
  last_stock_quantity NUMERIC,
  threshold_quantity NUMERIC,
  
  -- Prevent re-alerting until stock recovers
  alert_suppressed BOOLEAN NOT NULL DEFAULT false,
  suppressed_until TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(business_id, branch_id, product_id)
);

-- Enable RLS
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alert_states ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_notification_preferences
CREATE POLICY "Users can view own notification preferences"
ON public.user_notification_preferences FOR SELECT
USING (user_id = auth.uid() OR is_business_owner(business_id));

CREATE POLICY "Users can manage own notification preferences"
ON public.user_notification_preferences FOR ALL
USING (user_id = auth.uid() OR is_business_owner(business_id))
WITH CHECK (user_id = auth.uid() OR is_business_owner(business_id));

-- RLS Policies for notification_defaults (super admin only for write, all can read)
CREATE POLICY "Anyone can view notification defaults"
ON public.notification_defaults FOR SELECT
USING (true);

CREATE POLICY "Super admin can manage notification defaults"
ON public.notification_defaults FOR ALL
USING (has_admin_role(auth.uid(), 'super_admin'))
WITH CHECK (has_admin_role(auth.uid(), 'super_admin'));

-- RLS Policies for notification_events
CREATE POLICY "Business owners can view notification events"
ON public.notification_events FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "System can insert notification events"
ON public.notification_events FOR INSERT
WITH CHECK (is_business_owner(business_id) OR is_admin(auth.uid()));

CREATE POLICY "Super admin can view all notification events"
ON public.notification_events FOR SELECT
USING (is_admin(auth.uid()));

-- RLS Policies for notification_audit_logs
CREATE POLICY "Business owners can view their audit logs"
ON public.notification_audit_logs FOR SELECT
USING (is_business_owner(business_id));

CREATE POLICY "Super admin can view all audit logs"
ON public.notification_audit_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs"
ON public.notification_audit_logs FOR INSERT
WITH CHECK (true);

-- RLS Policies for low_stock_alert_states
CREATE POLICY "Business owners can manage low stock states"
ON public.low_stock_alert_states FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

-- Indexes for performance
CREATE INDEX idx_user_notification_preferences_user ON public.user_notification_preferences(user_id);
CREATE INDEX idx_user_notification_preferences_business ON public.user_notification_preferences(business_id);
CREATE INDEX idx_notification_events_status ON public.notification_events(status) WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_notification_events_dedup ON public.notification_events(dedup_key) WHERE dedup_key IS NOT NULL;
CREATE INDEX idx_notification_audit_logs_business ON public.notification_audit_logs(business_id);
CREATE INDEX idx_notification_audit_logs_type ON public.notification_audit_logs(notification_type);
CREATE INDEX idx_low_stock_alert_states_product ON public.low_stock_alert_states(product_id);

-- Triggers for updated_at
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_defaults_updated_at
  BEFORE UPDATE ON public.notification_defaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_low_stock_alert_states_updated_at
  BEFORE UPDATE ON public.low_stock_alert_states
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default notification configurations
INSERT INTO public.notification_defaults (notification_type, default_in_app_enabled, default_email_enabled, is_available, is_critical, description) VALUES
  ('low_stock_alert', true, false, true, true, 'Alert when inventory items fall below reorder threshold'),
  ('daily_sales_summary', true, true, true, false, 'Daily summary of sales sent at end of business day'),
  ('weekly_sales_report', true, true, true, false, 'Weekly sales report sent on configured day'),
  ('new_sale_notification', true, false, true, false, 'Real-time notification for new sales'),
  ('approval_request', true, true, true, true, 'Notification when approval is required'),
  ('approval_resolved', true, false, true, false, 'Notification when approval is resolved'),
  ('after_hours_alert', true, true, true, true, 'Alert for activity outside business hours'),
  ('system_announcement', true, true, true, true, 'Platform-wide announcements from super admin');