
CREATE TABLE public.order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own parts" ON public.order_parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own parts" ON public.order_parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own parts" ON public.order_parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own parts" ON public.order_parts FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  invoice_number text NOT NULL,
  client_name text NOT NULL,
  license_plate text NOT NULL,
  service text NOT NULL,
  parts_total numeric(10,2) NOT NULL DEFAULT 0,
  labor_cost numeric(10,2) NOT NULL DEFAULT 0,
  tax_rate numeric(5,2) NOT NULL DEFAULT 21,
  total numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'emitida',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices" ON public.invoices FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own invoices" ON public.invoices FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own invoices" ON public.invoices FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own invoices" ON public.invoices FOR DELETE USING (auth.uid() = user_id);
