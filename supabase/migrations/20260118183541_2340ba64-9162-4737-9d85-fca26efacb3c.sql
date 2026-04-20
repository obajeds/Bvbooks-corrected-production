-- Remove the unique constraint that prevents multiple entries per pump per day per staff
ALTER TABLE public.daily_pump_sales 
DROP CONSTRAINT IF EXISTS daily_pump_sales_pump_id_sale_date_staff_id_key;