-- Step 1: Add new enum values to bvbooks_plan
ALTER TYPE bvbooks_plan ADD VALUE IF NOT EXISTS 'professional';
ALTER TYPE bvbooks_plan ADD VALUE IF NOT EXISTS 'enterprise';