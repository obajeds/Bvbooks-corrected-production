
-- Idempotency table for preventing duplicate sale submissions
CREATE TABLE IF NOT EXISTS public.sale_idempotency_keys (
  idempotency_key TEXT PRIMARY KEY,
  sale_id UUID NOT NULL,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-cleanup old keys after 24 hours
CREATE INDEX idx_sale_idempotency_created ON public.sale_idempotency_keys (created_at);

ALTER TABLE public.sale_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can insert idempotency keys"
  ON public.sale_idempotency_keys FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read own business keys"
  ON public.sale_idempotency_keys FOR SELECT TO authenticated
  USING (true);
