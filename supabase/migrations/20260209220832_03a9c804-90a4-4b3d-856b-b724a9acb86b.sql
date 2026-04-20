ALTER TABLE public.business_notifications 
ALTER COLUMN entity_id TYPE text USING entity_id::text;