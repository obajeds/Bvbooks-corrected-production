-- Create pump/product types enum
CREATE TYPE public.fuel_type AS ENUM ('pms', 'ago', 'dpk', 'lpg');

-- Create pumps table for each branch
CREATE TABLE public.pumps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fuel_type fuel_type NOT NULL DEFAULT 'pms',
  price_per_liter NUMERIC(12,2) NOT NULL DEFAULT 0,
  current_meter_reading NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily pump sales table (cashier entries)
CREATE TABLE public.daily_pump_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
  pump_id UUID NOT NULL REFERENCES public.pumps(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Meter readings
  opening_meter NUMERIC(14,2) NOT NULL,
  closing_meter NUMERIC(14,2) NOT NULL,
  
  -- Calculated fields (auto-computed but stored for audit)
  liters_sold NUMERIC(14,2) GENERATED ALWAYS AS (closing_meter - opening_meter) STORED,
  price_per_liter NUMERIC(12,2) NOT NULL,
  expected_revenue NUMERIC(14,2) GENERATED ALWAYS AS ((closing_meter - opening_meter) * price_per_liter) STORED,
  
  -- Payment breakdown
  cash_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
  pos_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
  transfer_collected NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_collected NUMERIC(14,2) GENERATED ALWAYS AS (cash_collected + pos_collected + transfer_collected) STORED,
  
  -- Variance (positive = overage, negative = shortage)
  variance NUMERIC(14,2) GENERATED ALWAYS AS ((cash_collected + pos_collected + transfer_collected) - ((closing_meter - opening_meter) * price_per_liter)) STORED,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'approved', 'flagged')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES public.staff(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate entries for same pump on same date by same cashier
  UNIQUE(pump_id, sale_date, staff_id)
);

-- Create daily summary view for managers
CREATE OR REPLACE VIEW public.daily_sales_summary AS
SELECT 
  dps.business_id,
  dps.branch_id,
  dps.sale_date,
  COUNT(DISTINCT dps.staff_id) as cashier_count,
  COUNT(dps.id) as entry_count,
  SUM(dps.liters_sold) as total_liters,
  SUM(dps.expected_revenue) as total_expected,
  SUM(dps.cash_collected) as total_cash,
  SUM(dps.pos_collected) as total_pos,
  SUM(dps.transfer_collected) as total_transfer,
  SUM(dps.total_collected) as grand_total,
  SUM(dps.variance) as total_variance,
  COUNT(CASE WHEN dps.status = 'submitted' THEN 1 END) as submitted_count,
  COUNT(CASE WHEN dps.status = 'pending' THEN 1 END) as pending_count,
  COUNT(CASE WHEN dps.variance < 0 THEN 1 END) as shortage_count
FROM public.daily_pump_sales dps
GROUP BY dps.business_id, dps.branch_id, dps.sale_date;

-- Enable RLS
ALTER TABLE public.pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_pump_sales ENABLE ROW LEVEL SECURITY;

-- RLS for pumps
CREATE POLICY "Users can view pumps in their business"
ON public.pumps FOR SELECT
USING (
  is_business_owner(business_id) OR is_staff_of_business(business_id)
);

CREATE POLICY "Owners can manage pumps"
ON public.pumps FOR ALL
USING (is_business_owner(business_id));

-- RLS for daily_pump_sales
CREATE POLICY "Staff can view sales in their business"
ON public.daily_pump_sales FOR SELECT
USING (
  is_business_owner(business_id) OR is_staff_of_business(business_id)
);

CREATE POLICY "Staff can create their own sales entries"
ON public.daily_pump_sales FOR INSERT
WITH CHECK (
  is_business_owner(business_id) OR 
  (is_staff_of_business(business_id) AND staff_id = (
    SELECT id FROM staff WHERE user_id = auth.uid() AND business_id = daily_pump_sales.business_id LIMIT 1
  ))
);

CREATE POLICY "Staff can update their pending entries"
ON public.daily_pump_sales FOR UPDATE
USING (
  is_business_owner(business_id) OR 
  (status = 'pending' AND staff_id = (
    SELECT id FROM staff WHERE user_id = auth.uid() LIMIT 1
  ))
);

-- Trigger to update pump meter on submission
CREATE OR REPLACE FUNCTION public.update_pump_meter_on_submit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'pending' THEN
    NEW.submitted_at = now();
    -- Update pump's current meter reading
    UPDATE public.pumps 
    SET current_meter_reading = NEW.closing_meter, updated_at = now()
    WHERE id = NEW.pump_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_daily_pump_sale_submit
BEFORE UPDATE ON public.daily_pump_sales
FOR EACH ROW
EXECUTE FUNCTION public.update_pump_meter_on_submit();

-- Trigger for updated_at
CREATE TRIGGER update_pumps_updated_at
BEFORE UPDATE ON public.pumps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_daily_pump_sales_updated_at
BEFORE UPDATE ON public.daily_pump_sales
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_pump_sales;