-- Create suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'received', 'cancelled')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  expected_date DATE,
  received_date DATE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase order items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  total_cost NUMERIC(12,2) NOT NULL,
  received_quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create departments table
CREATE TABLE public.departments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  manager_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create staff table
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  user_id UUID,
  employee_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  hire_date DATE,
  salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add manager reference after staff table is created
ALTER TABLE public.departments ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES public.staff(id) ON DELETE SET NULL;

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE,
  clock_out TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'on_leave')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(staff_id, date)
);

-- Create leave requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create payroll table
CREATE TABLE public.payroll (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  basic_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  allowances NUMERIC(12,2) NOT NULL DEFAULT 0,
  deductions NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expense categories table
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create expenses table
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  receipt_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for suppliers
CREATE POLICY "Business owners can manage suppliers" ON public.suppliers
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for purchase_orders
CREATE POLICY "Business owners can manage purchase orders" ON public.purchase_orders
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for purchase_order_items
CREATE POLICY "Users can manage PO items for their POs" ON public.purchase_order_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
    AND is_business_owner(purchase_orders.business_id)
  )) WITH CHECK (EXISTS (
    SELECT 1 FROM public.purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id 
    AND is_business_owner(purchase_orders.business_id)
  ));

-- RLS Policies for departments
CREATE POLICY "Business owners can manage departments" ON public.departments
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for staff
CREATE POLICY "Business owners can manage staff" ON public.staff
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for attendance
CREATE POLICY "Business owners can manage attendance" ON public.attendance
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for leave_requests
CREATE POLICY "Business owners can manage leave requests" ON public.leave_requests
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for payroll
CREATE POLICY "Business owners can manage payroll" ON public.payroll
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for expense_categories
CREATE POLICY "Business owners can manage expense categories" ON public.expense_categories
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for expenses
CREATE POLICY "Business owners can manage expenses" ON public.expenses
  FOR ALL USING (is_business_owner(business_id)) WITH CHECK (is_business_owner(business_id));

-- RLS Policies for activity_logs
CREATE POLICY "Business owners can view activity logs" ON public.activity_logs
  FOR SELECT USING (is_business_owner(business_id));
CREATE POLICY "Business owners can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (is_business_owner(business_id));

-- Create triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_payroll_updated_at BEFORE UPDATE ON public.payroll
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Create indexes for performance
CREATE INDEX idx_suppliers_business_id ON public.suppliers(business_id);
CREATE INDEX idx_purchase_orders_business_id ON public.purchase_orders(business_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_order_items_po_id ON public.purchase_order_items(purchase_order_id);
CREATE INDEX idx_departments_business_id ON public.departments(business_id);
CREATE INDEX idx_staff_business_id ON public.staff(business_id);
CREATE INDEX idx_staff_branch_id ON public.staff(branch_id);
CREATE INDEX idx_staff_department_id ON public.staff(department_id);
CREATE INDEX idx_attendance_business_id ON public.attendance(business_id);
CREATE INDEX idx_attendance_staff_id ON public.attendance(staff_id);
CREATE INDEX idx_attendance_date ON public.attendance(date);
CREATE INDEX idx_leave_requests_business_id ON public.leave_requests(business_id);
CREATE INDEX idx_leave_requests_staff_id ON public.leave_requests(staff_id);
CREATE INDEX idx_payroll_business_id ON public.payroll(business_id);
CREATE INDEX idx_payroll_staff_id ON public.payroll(staff_id);
CREATE INDEX idx_expense_categories_business_id ON public.expense_categories(business_id);
CREATE INDEX idx_expenses_business_id ON public.expenses(business_id);
CREATE INDEX idx_expenses_category_id ON public.expenses(category_id);
CREATE INDEX idx_activity_logs_business_id ON public.activity_logs(business_id);
CREATE INDEX idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);