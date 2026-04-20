-- Fix sale_items quantity to support decimals
ALTER TABLE public.sale_items 
ALTER COLUMN quantity TYPE NUMERIC USING quantity::NUMERIC;

-- Fix purchase_order_items quantities
ALTER TABLE public.purchase_order_items 
ALTER COLUMN quantity TYPE NUMERIC USING quantity::NUMERIC;

ALTER TABLE public.purchase_order_items 
ALTER COLUMN received_quantity TYPE NUMERIC USING received_quantity::NUMERIC;

-- Fix stock_movements quantities
ALTER TABLE public.stock_movements 
ALTER COLUMN quantity TYPE NUMERIC USING quantity::NUMERIC;

ALTER TABLE public.stock_movements 
ALTER COLUMN previous_quantity TYPE NUMERIC USING previous_quantity::NUMERIC;

ALTER TABLE public.stock_movements 
ALTER COLUMN new_quantity TYPE NUMERIC USING new_quantity::NUMERIC;