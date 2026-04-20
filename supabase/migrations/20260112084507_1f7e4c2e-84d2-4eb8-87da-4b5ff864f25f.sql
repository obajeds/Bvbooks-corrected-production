
-- 1. Create devices table for tracking cashier devices
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_fingerprint TEXT UNIQUE NOT NULL,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  device_name TEXT,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Create offline_sales_queue for queued offline sales
CREATE TABLE IF NOT EXISTS public.offline_sales_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE
);

-- 3. Create sales_ledger for immutable audit trail
CREATE TABLE IF NOT EXISTS public.sales_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  payment_type TEXT NOT NULL,
  reference TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create sync_logs for tracking sync operations
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  records_sent INTEGER DEFAULT 0,
  records_received INTEGER DEFAULT 0,
  status TEXT DEFAULT 'success' CHECK (status IN ('success', 'partial', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Create daily_sync_status for tracking daily sync progress
CREATE TABLE IF NOT EXISTS public.daily_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  expected_sales INTEGER DEFAULT 0,
  synced_sales INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'synced')),
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, cashier_id, sale_date)
);

-- 6. Create day_locks for end-of-day locking
CREATE TABLE IF NOT EXISTS public.day_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  cashier_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sale_date DATE NOT NULL,
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMP WITH TIME ZONE,
  locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unlock_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, cashier_id, sale_date)
);

-- Enable RLS on all new tables
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sales_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.day_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for devices
CREATE POLICY "Users can view their own devices" ON public.devices
  FOR SELECT USING (cashier_id = auth.uid() OR is_business_owner(business_id) OR is_staff_of_business(business_id));

CREATE POLICY "Users can register their devices" ON public.devices
  FOR INSERT WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "Users can update their own devices" ON public.devices
  FOR UPDATE USING (cashier_id = auth.uid());

-- RLS Policies for offline_sales_queue
CREATE POLICY "Users can view their own queued sales" ON public.offline_sales_queue
  FOR SELECT USING (cashier_id = auth.uid() OR is_business_owner(business_id) OR is_staff_of_business(business_id));

CREATE POLICY "Users can insert queued sales" ON public.offline_sales_queue
  FOR INSERT WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "Users can update their own queued sales" ON public.offline_sales_queue
  FOR UPDATE USING (cashier_id = auth.uid());

-- RLS Policies for sales_ledger (read-only for users, insert via edge function)
CREATE POLICY "Users can view ledger entries for their business" ON public.sales_ledger
  FOR SELECT USING (is_business_owner(business_id) OR is_staff_of_business(business_id));

-- RLS Policies for sync_logs
CREATE POLICY "Users can view sync logs for their business" ON public.sync_logs
  FOR SELECT USING (is_business_owner(business_id) OR is_staff_of_business(business_id));

-- RLS Policies for daily_sync_status
CREATE POLICY "Users can view sync status for their business" ON public.daily_sync_status
  FOR SELECT USING (is_business_owner(business_id) OR is_staff_of_business(business_id));

CREATE POLICY "Users can update their own sync status" ON public.daily_sync_status
  FOR ALL USING (cashier_id = auth.uid() OR is_business_owner(business_id));

-- RLS Policies for day_locks
CREATE POLICY "Users can view day locks for their business" ON public.day_locks
  FOR SELECT USING (is_business_owner(business_id) OR is_staff_of_business(business_id));

CREATE POLICY "Owners can manage day locks" ON public.day_locks
  FOR ALL USING (is_business_owner(business_id));

-- 7. Create function to check if a day is locked
CREATE OR REPLACE FUNCTION public.is_day_locked(
  _business_id UUID,
  _cashier_id UUID,
  _sale_date DATE
) RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT locked FROM day_locks 
     WHERE business_id = _business_id 
       AND cashier_id = _cashier_id 
       AND sale_date = _sale_date),
    false
  )
$$;

-- 8. Create trigger function to enforce day locks on sales
CREATE OR REPLACE FUNCTION public.enforce_day_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sale_date DATE;
  _cashier_id UUID;
  _is_locked BOOLEAN;
BEGIN
  -- Get the sale date and cashier from the record
  IF TG_OP = 'DELETE' THEN
    _sale_date := OLD.created_at::DATE;
    _cashier_id := OLD.created_by;
  ELSE
    _sale_date := COALESCE(NEW.created_at, OLD.created_at)::DATE;
    _cashier_id := COALESCE(NEW.created_by, OLD.created_by);
  END IF;

  -- Skip if no cashier assigned
  IF _cashier_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Check if the day is locked
  SELECT locked INTO _is_locked
  FROM day_locks
  WHERE business_id = (
    SELECT business_id FROM sales WHERE id = COALESCE(OLD.id, NEW.id)
  )
  AND cashier_id = _cashier_id
  AND sale_date = _sale_date;

  IF _is_locked = true THEN
    RAISE EXCEPTION 'Sales for this day are locked. Contact a manager to unlock.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- 9. Create trigger on sales table
DROP TRIGGER IF EXISTS enforce_day_lock_trigger ON public.sales;
CREATE TRIGGER enforce_day_lock_trigger
  BEFORE UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_day_lock();

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_devices_cashier ON public.devices(cashier_id);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON public.devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON public.offline_sales_queue(status);
CREATE INDEX IF NOT EXISTS idx_offline_queue_cashier ON public.offline_sales_queue(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_sale ON public.sales_ledger(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_ledger_cashier ON public.sales_ledger(cashier_id);
CREATE INDEX IF NOT EXISTS idx_sync_status_date ON public.daily_sync_status(sale_date);
CREATE INDEX IF NOT EXISTS idx_day_locks_lookup ON public.day_locks(business_id, cashier_id, sale_date);

-- 11. Create function to update sync status
CREATE OR REPLACE FUNCTION public.update_sync_status(
  _business_id UUID,
  _cashier_id UUID,
  _sale_date DATE,
  _increment_synced INTEGER DEFAULT 1
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO daily_sync_status (business_id, cashier_id, sale_date, synced_sales, last_sync, status)
  VALUES (_business_id, _cashier_id, _sale_date, _increment_synced, now(), 'partial')
  ON CONFLICT (business_id, cashier_id, sale_date)
  DO UPDATE SET
    synced_sales = daily_sync_status.synced_sales + _increment_synced,
    last_sync = now(),
    status = CASE 
      WHEN daily_sync_status.synced_sales + _increment_synced >= daily_sync_status.expected_sales THEN 'synced'
      ELSE 'partial'
    END,
    updated_at = now();
END;
$$;
