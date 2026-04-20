-- Confirm all existing unverified users by setting their email_confirmed_at
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email_confirmed_at IS NULL;