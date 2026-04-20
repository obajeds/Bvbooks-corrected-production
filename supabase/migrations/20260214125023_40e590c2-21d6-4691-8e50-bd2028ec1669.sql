
-- Add idempotency_key column to stock_movements
ALTER TABLE public.stock_movements
ADD COLUMN idempotency_key text;

-- Create unique index (nullable, so NULLs are allowed but non-null values must be unique)
CREATE UNIQUE INDEX idx_stock_movements_idempotency_key
ON public.stock_movements (idempotency_key)
WHERE idempotency_key IS NOT NULL;
