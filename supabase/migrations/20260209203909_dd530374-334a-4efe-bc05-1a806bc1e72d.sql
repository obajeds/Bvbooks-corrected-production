-- Delete duplicate settlements, keeping only the latest one per cashier+date+payment_type
DELETE FROM settlements
WHERE id NOT IN (
  SELECT DISTINCT ON (business_id, cashier_id, settlement_date, payment_type) id
  FROM settlements
  ORDER BY business_id, cashier_id, settlement_date, payment_type, created_at DESC
);

-- Now add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX idx_settlements_unique_entry 
ON public.settlements (business_id, cashier_id, settlement_date, payment_type);

-- Add unique constraint on reconciliations too
CREATE UNIQUE INDEX idx_reconciliations_unique_entry 
ON public.reconciliations (business_id, cashier_id, sale_date, payment_type);