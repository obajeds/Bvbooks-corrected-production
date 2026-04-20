-- Encrypt admin MFA backup codes at rest using SHA-256
-- Note: This creates a trigger to hash backup codes before storage
CREATE OR REPLACE FUNCTION public.hash_mfa_backup_codes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only hash if backup_codes is being set and not already hashed
  IF NEW.backup_codes IS NOT NULL AND array_length(NEW.backup_codes, 1) > 0 THEN
    -- Check if first code looks like a hash (64 chars hex)
    IF length(NEW.backup_codes[1]) < 64 THEN
      -- Hash each backup code using SHA-256
      NEW.backup_codes := ARRAY(
        SELECT encode(sha256(code::bytea), 'hex')
        FROM unnest(NEW.backup_codes) AS code
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for hashing backup codes
DROP TRIGGER IF EXISTS hash_backup_codes_trigger ON public.admin_mfa_settings;
CREATE TRIGGER hash_backup_codes_trigger
BEFORE INSERT OR UPDATE OF backup_codes ON public.admin_mfa_settings
FOR EACH ROW
EXECUTE FUNCTION public.hash_mfa_backup_codes();

-- Hash admin session tokens before storage
CREATE OR REPLACE FUNCTION public.hash_session_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Hash the session token if not already hashed (check length)
  IF NEW.session_token IS NOT NULL AND length(NEW.session_token) < 64 THEN
    NEW.session_token := encode(sha256(NEW.session_token::bytea), 'hex');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for hashing session tokens
DROP TRIGGER IF EXISTS hash_session_token_trigger ON public.admin_sessions;
CREATE TRIGGER hash_session_token_trigger
BEFORE INSERT ON public.admin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.hash_session_token();