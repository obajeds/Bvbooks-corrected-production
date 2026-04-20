-- Create categories table with parent-child support
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products/items table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'pcs',
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  selling_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create stock movements table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer')),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity INTEGER NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create customers table
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  total_purchases NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded', 'partial')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_main BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create function to check business ownership
CREATE OR REPLACE FUNCTION public.is_business_owner(_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = _business_id
      AND owner_user_id = auth.uid()
  )
$$;

-- RLS Policies for categories
CREATE POLICY "Business owners can view their categories" ON public.categories
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert categories" ON public.categories
  FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "Business owners can update their categories" ON public.categories
  FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "Business owners can delete their categories" ON public.categories
  FOR DELETE USING (is_business_owner(business_id));

-- RLS Policies for products
CREATE POLICY "Business owners can view their products" ON public.products
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert products" ON public.products
  FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "Business owners can update their products" ON public.products
  FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "Business owners can delete their products" ON public.products
  FOR DELETE USING (is_business_owner(business_id));

-- RLS Policies for stock_movements
CREATE POLICY "Business owners can view their stock movements" ON public.stock_movements
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert stock movements" ON public.stock_movements
  FOR INSERT WITH CHECK (is_business_owner(business_id));

-- RLS Policies for customers
CREATE POLICY "Business owners can view their customers" ON public.customers
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert customers" ON public.customers
  FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "Business owners can update their customers" ON public.customers
  FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "Business owners can delete their customers" ON public.customers
  FOR DELETE USING (is_business_owner(business_id));

-- RLS Policies for sales
CREATE POLICY "Business owners can view their sales" ON public.sales
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert sales" ON public.sales
  FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "Business owners can update their sales" ON public.sales
  FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "Business owners can delete their sales" ON public.sales
  FOR DELETE USING (is_business_owner(business_id));

-- RLS Policies for sale_items (via sale relationship)
CREATE POLICY "Users can view sale items for their sales" ON public.sale_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND is_business_owner(sales.business_id)
  ));
CREATE POLICY "Users can insert sale items for their sales" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND is_business_owner(sales.business_id)
  ));

-- RLS Policies for branches
CREATE POLICY "Business owners can view their branches" ON public.branches
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert branches" ON public.branches
  FOR INSERT WITH CHECK (is_business_owner(business_id));
CREATE POLICY "Business owners can update their branches" ON public.branches
  FOR UPDATE USING (is_business_owner(business_id));
CREATE POLICY "Business owners can delete their branches" ON public.branches
  FOR DELETE USING (is_business_owner(business_id));

-- Create triggers for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_categories_business_id ON public.categories(business_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX idx_products_business_id ON public.products(business_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_sku ON public.products(sku);
CREATE INDEX idx_products_barcode ON public.products(barcode);
CREATE INDEX idx_stock_movements_business_id ON public.stock_movements(business_id);
CREATE INDEX idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_sales_business_id ON public.sales(business_id);
CREATE INDEX idx_sales_customer_id ON public.sales(customer_id);
CREATE INDEX idx_sales_invoice_number ON public.sales(invoice_number);
CREATE INDEX idx_sale_items_sale_id ON public.sale_items(sale_id);
CREATE INDEX idx_branches_business_id ON public.branches(business_id);