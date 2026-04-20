-- Create device_sessions table for tracking device and session metadata
CREATE TABLE public.device_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  session_token_hash TEXT NOT NULL,
  device_fingerprint_hash TEXT,
  device_type TEXT,
  device_category TEXT,
  os_name TEXT,
  os_version TEXT,
  browser_name TEXT,
  browser_version TEXT,
  app_version TEXT,
  language TEXT,
  timezone TEXT,
  screen_resolution TEXT,
  ip_hash TEXT,
  country_code TEXT,
  region TEXT,
  city TEXT,
  is_new_device BOOLEAN DEFAULT true,
  is_new_location BOOLEAN DEFAULT true,
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
  risk_factors JSONB DEFAULT '[]',
  trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100),
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security_signals table for logging security events
CREATE TABLE public.security_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  device_session_id UUID REFERENCES public.device_sessions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  signal_type TEXT NOT NULL,
  signal_category TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'alert', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  ip_hash TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create known_devices table to track familiar devices per user
CREATE TABLE public.known_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint_hash TEXT NOT NULL,
  device_name TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_count INTEGER DEFAULT 1,
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint_hash)
);

-- Create known_locations table to track familiar locations per user
CREATE TABLE public.known_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_hash TEXT NOT NULL,
  country_code TEXT,
  region TEXT,
  city TEXT,
  first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  session_count INTEGER DEFAULT 1,
  is_trusted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ip_hash)
);

-- Enable RLS
ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.known_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.known_locations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for device_sessions
CREATE POLICY "Super admins can read all device sessions"
ON public.device_sessions FOR SELECT
USING (is_super_admin_domain(auth.uid()));

CREATE POLICY "Users can read own device sessions"
ON public.device_sessions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can insert device sessions"
ON public.device_sessions FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update device sessions"
ON public.device_sessions FOR UPDATE
USING (true);

-- RLS Policies for security_signals
CREATE POLICY "Super admins can read all security signals"
ON public.security_signals FOR SELECT
USING (is_super_admin_domain(auth.uid()));

CREATE POLICY "Super admins can update security signals"
ON public.security_signals FOR UPDATE
USING (is_super_admin_domain(auth.uid()));

CREATE POLICY "System can insert security signals"
ON public.security_signals FOR INSERT
WITH CHECK (true);

-- RLS Policies for known_devices
CREATE POLICY "Users can read own known devices"
ON public.known_devices FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage known devices"
ON public.known_devices FOR ALL
USING (true);

-- RLS Policies for known_locations
CREATE POLICY "Users can read own known locations"
ON public.known_locations FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can manage known locations"
ON public.known_locations FOR ALL
USING (true);

-- Create indexes for performance
CREATE INDEX idx_device_sessions_user_id ON public.device_sessions(user_id);
CREATE INDEX idx_device_sessions_business_id ON public.device_sessions(business_id);
CREATE INDEX idx_device_sessions_risk_level ON public.device_sessions(risk_level);
CREATE INDEX idx_device_sessions_last_seen ON public.device_sessions(last_seen_at DESC);
CREATE INDEX idx_security_signals_severity ON public.security_signals(severity);
CREATE INDEX idx_security_signals_created_at ON public.security_signals(created_at DESC);
CREATE INDEX idx_security_signals_resolved ON public.security_signals(resolved);
CREATE INDEX idx_known_devices_user ON public.known_devices(user_id);
CREATE INDEX idx_known_locations_user ON public.known_locations(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_device_sessions_updated_at
BEFORE UPDATE ON public.device_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();