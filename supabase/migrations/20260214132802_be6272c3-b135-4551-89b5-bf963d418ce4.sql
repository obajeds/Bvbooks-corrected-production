
-- Attach the existing trigger function to the sales table
CREATE TRIGGER on_sale_update_customer
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_on_sale();
