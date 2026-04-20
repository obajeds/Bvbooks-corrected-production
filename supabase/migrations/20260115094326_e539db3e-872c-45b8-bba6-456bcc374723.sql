-- Add INSERT policy for business owners to create expenses
CREATE POLICY "Business owners can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (business_id = public.get_owned_business_id());

-- Add INSERT policy for staff to create expenses
CREATE POLICY "Staff can create expenses"
ON public.expenses
FOR INSERT
WITH CHECK (business_id = public.get_staff_business_id());

-- Add UPDATE policy for business owners
CREATE POLICY "Business owners can update expenses"
ON public.expenses
FOR UPDATE
USING (business_id = public.get_owned_business_id());

-- Add DELETE policy for business owners
CREATE POLICY "Business owners can delete expenses"
ON public.expenses
FOR DELETE
USING (business_id = public.get_owned_business_id());