-- Add missing pos.rewards.redeem permission key to the enum
ALTER TYPE permission_key ADD VALUE IF NOT EXISTS 'pos.rewards.redeem';