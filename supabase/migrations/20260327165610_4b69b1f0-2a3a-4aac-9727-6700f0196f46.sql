
-- Tighten RLS: only allow users to insert/read keys for their own business
DROP POLICY IF EXISTS "Authenticated users can insert idempotency keys" ON public.sale_idempotency_keys;
DROP POLICY IF EXISTS "Authenticated users can read own business keys" ON public.sale_idempotency_keys;

CREATE POLICY "Users can insert idempotency keys for own business"
  ON public.sale_idempotency_keys FOR INSERT TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
      UNION
      SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can read idempotency keys for own business"
  ON public.sale_idempotency_keys FOR SELECT TO authenticated
  USING (
    business_id IN (
      SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
      UNION
      SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
    )
  );
