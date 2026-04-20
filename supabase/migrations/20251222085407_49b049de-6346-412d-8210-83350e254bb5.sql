-- Change stock_quantity from INTEGER to NUMERIC to support decimal quantities
ALTER TABLE public.products 
ALTER COLUMN stock_quantity TYPE NUMERIC USING stock_quantity::NUMERIC;

-- Also update low_stock_threshold to support decimals
ALTER TABLE public.products 
ALTER COLUMN low_stock_threshold TYPE NUMERIC USING low_stock_threshold::NUMERIC;