-- Create trigger to auto-calculate reconciliation when settlement is created/updated
CREATE OR REPLACE FUNCTION public.trigger_reconciliation_on_settlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Calculate reconciliation for this cashier/payment_type/date combination
  PERFORM calculate_reconciliation(
    NEW.business_id,
    NEW.cashier_id,
    NEW.payment_type,
    NEW.settlement_date
  );
  RETURN NEW;
END;
$function$;

-- Create trigger on settlements table
CREATE TRIGGER on_settlement_upsert
  AFTER INSERT OR UPDATE ON public.settlements
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_reconciliation_on_settlement();

-- Also add RLS policies for reconciliations table so users can view them
CREATE POLICY "Users can view their business reconciliations"
ON public.reconciliations
FOR SELECT
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update their business reconciliations"
ON public.reconciliations
FOR UPDATE
USING (
  business_id IN (
    SELECT id FROM public.businesses WHERE owner_user_id = auth.uid()
    UNION
    SELECT business_id FROM public.staff WHERE user_id = auth.uid() AND is_active = true
  )
);