
ALTER TABLE public.stock_movements
DROP CONSTRAINT IF EXISTS stock_movements_movement_type_check;

ALTER TABLE public.stock_movements
ADD CONSTRAINT stock_movements_movement_type_check
CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer', 'sale', 'transfer_in', 'transfer_out', 'return', 'purchase', 'damage'));
