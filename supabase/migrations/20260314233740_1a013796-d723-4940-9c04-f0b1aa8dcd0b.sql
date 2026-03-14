
-- 1. company_settings
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_name text DEFAULT '',
  cif text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  address text DEFAULT '',
  city text DEFAULT '',
  postal_code text DEFAULT '',
  province text DEFAULT '',
  default_vat numeric DEFAULT 21,
  labor_rate numeric DEFAULT 35,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own company_settings" ON public.company_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own company_settings" ON public.company_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own company_settings" ON public.company_settings FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. work_orders
CREATE TABLE public.work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  repair_start_time timestamptz,
  repair_end_time timestamptz,
  repair_time_hours numeric DEFAULT 0,
  labor_rate numeric DEFAULT 35,
  labor_cost numeric DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own work_orders" ON public.work_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own work_orders" ON public.work_orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own work_orders" ON public.work_orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own work_orders" ON public.work_orders FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_work_orders_updated_at
  BEFORE UPDATE ON public.work_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. invoice_series
CREATE TABLE public.invoice_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  prefix text DEFAULT '',
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM now())::integer,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, year)
);

ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoice_series" ON public.invoice_series FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoice_series" ON public.invoice_series FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invoice_series" ON public.invoice_series FOR UPDATE USING (auth.uid() = user_id);

-- 4. invoice_lines
CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  line_type text NOT NULL DEFAULT 'part',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoice_lines" ON public.invoice_lines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoice_lines" ON public.invoice_lines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoice_lines" ON public.invoice_lines FOR DELETE USING (auth.uid() = user_id);

-- 5. invoice_items
CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  item_type text NOT NULL DEFAULT 'part',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invoice_items" ON public.invoice_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own invoice_items" ON public.invoice_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own invoice_items" ON public.invoice_items FOR DELETE USING (auth.uid() = user_id);
