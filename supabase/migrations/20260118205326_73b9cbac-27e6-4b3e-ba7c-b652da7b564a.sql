-- Update the payment_type check constraint to use 'card' instead of 'pos'
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_payment_type_check;

ALTER TABLE settlements ADD CONSTRAINT settlements_payment_type_check 
CHECK (payment_type = ANY (ARRAY['cash'::text, 'card'::text, 'transfer'::text, 'credit'::text]));