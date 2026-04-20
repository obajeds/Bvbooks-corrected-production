-- Update the addon record to add the second purchase
UPDATE business_addons 
SET quantity = 2,
    amount_paid = 8000,
    end_date = '2026-01-26T21:12:05.000Z',
    payment_reference = 's8jtolperj',
    updated_at = NOW()
WHERE business_id = '5a10600e-38e4-4543-b984-68d0590f4172'
  AND addon_feature_id = 'e5a20fd2-ee24-4dbd-9c84-b75102473531';