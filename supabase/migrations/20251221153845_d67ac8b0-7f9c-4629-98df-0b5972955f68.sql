-- Add is_locked column to role_templates table
ALTER TABLE public.role_templates 
ADD COLUMN is_locked boolean NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.role_templates.is_locked IS 'When true, the role template cannot be edited or deleted';