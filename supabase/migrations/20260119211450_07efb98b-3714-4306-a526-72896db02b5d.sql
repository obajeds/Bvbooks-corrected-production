-- Make period_end column nullable to allow open-ended payroll periods
ALTER TABLE public.payroll ALTER COLUMN period_end DROP NOT NULL;