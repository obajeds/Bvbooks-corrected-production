
-- Fix invalidate_cache_on_sale: use net.http_post, no hardcoded values, non-blocking
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  _key := current_setting('app.settings.supabase_anon_key', true);

  IF _url IS NULL OR _key IS NULL OR _url = '' OR _key = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := _url || '/functions/v1/cache-invalidate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object('type', 'sale', 'record_id', NEW.id, 'business_id', NEW.business_id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Cache invalidation must never block a sale
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Fix invalidate_cache_on_inventory: use net.http_post, no hardcoded values, non-blocking
CREATE OR REPLACE FUNCTION public.invalidate_cache_on_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  _key := current_setting('app.settings.supabase_anon_key', true);

  IF _url IS NULL OR _key IS NULL OR _url = '' OR _key = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := _url || '/functions/v1/cache-invalidate',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object('type', 'inventory', 'record_id', NEW.id, 'business_id', NEW.business_id)
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

-- Fix send_event_email_notification: use net.http_post, no hardcoded values, non-blocking
CREATE OR REPLACE FUNCTION public.send_event_email_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
BEGIN
  _url := current_setting('app.settings.supabase_url', true);
  _key := current_setting('app.settings.supabase_anon_key', true);

  IF _url IS NULL OR _key IS NULL OR _url = '' OR _key = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM net.http_post(
      url := _url || '/functions/v1/send-event-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _key
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;
