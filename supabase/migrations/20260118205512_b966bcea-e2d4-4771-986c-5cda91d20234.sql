-- Update the reconciliations payment_type check constraint to use 'card' instead of 'pos'
ALTER TABLE reconciliations DROP CONSTRAINT IF EXISTS reconciliations_payment_type_check;

ALTER TABLE reconciliations ADD CONSTRAINT reconciliations_payment_type_check 
CHECK (payment_type = ANY (ARRAY['cash'::text, 'card'::text, 'transfer'::text, 'credit'::text]));