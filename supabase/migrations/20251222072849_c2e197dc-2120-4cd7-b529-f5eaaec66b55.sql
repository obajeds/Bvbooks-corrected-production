-- 1. Add platform feature for credit sales toggle (super admin control)
INSERT INTO platform_features (feature_key, feature_name, description, category, is_enabled, applicable_plans)
VALUES (
  'credit_sales',
  'Credit Sales',
  'Allow businesses to sell on credit to customers',
  'Sales',
  true,
  ARRAY['enterprise']::subscription_plan[]
)
ON CONFLICT (feature_key) DO UPDATE SET
  applicable_plans = ARRAY['enterprise']::subscription_plan[],
  updated_at = now();

-- 2. Update plan_features to disable credit for basic/professional plan (only enterprise)
UPDATE plan_features 
SET is_enabled = false 
WHERE feature_key = 'customers.credit' AND plan IN ('basic', 'free');

-- Ensure enterprise/premium has it enabled
UPDATE plan_features 
SET is_enabled = true 
WHERE feature_key = 'customers.credit' AND plan = 'premium';

-- 3. Create credit_transactions table to track credit sales and payments
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sale_id uuid REFERENCES sales(id) ON DELETE SET NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('credit_sale', 'payment', 'adjustment')),
  amount numeric NOT NULL,
  balance_after numeric NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_transactions
CREATE POLICY "Business owners can manage credit transactions"
ON credit_transactions FOR ALL
USING (is_business_owner(business_id))
WITH CHECK (is_business_owner(business_id));

CREATE POLICY "Staff with crm.manage can view credit transactions"
ON credit_transactions FOR SELECT
USING (EXISTS (
  SELECT 1 FROM staff s 
  WHERE s.business_id = credit_transactions.business_id 
  AND s.user_id = auth.uid() 
  AND s.is_active = true
));

CREATE POLICY "Staff with crm.manage can insert credit transactions"
ON credit_transactions FOR INSERT
WITH CHECK (
  has_permission(auth.uid(), 'crm.manage'::permission_key) 
  AND EXISTS (
    SELECT 1 FROM staff s 
    WHERE s.business_id = credit_transactions.business_id 
    AND s.user_id = auth.uid() 
    AND s.is_active = true
  )
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_credit_transactions_customer ON credit_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_business ON credit_transactions(business_id);

-- Add payment_status 'credit' to sales if not existing check constraint
-- (payment_status column already exists, just need to allow 'credit' value)