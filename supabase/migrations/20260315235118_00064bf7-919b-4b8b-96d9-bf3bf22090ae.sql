
-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL DEFAULT '',
  license_plate TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  brand TEXT,
  model TEXT,
  phone TEXT,
  notes TEXT,
  estimated_hours NUMERIC NOT NULL DEFAULT 0,
  labor_rate NUMERIC NOT NULL DEFAULT 35,
  labor_cost NUMERIC NOT NULL DEFAULT 0,
  parts_total NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 21,
  total NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendiente',
  user_id UUID NOT NULL,
  workshop_id UUID REFERENCES public.company_settings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quote lines table
CREATE TABLE IF NOT EXISTS public.quote_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  description TEXT NOT NULL DEFAULT '',
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  line_type TEXT NOT NULL DEFAULT 'part',
  user_id UUID NOT NULL,
  workshop_id UUID REFERENCES public.company_settings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotes
CREATE POLICY "Workshop can view own quotes" ON public.quotes FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own quotes" ON public.quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own quotes" ON public.quotes FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own quotes" ON public.quotes FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- RLS policies for quote_lines
CREATE POLICY "Workshop can view own quote_lines" ON public.quote_lines FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own quote_lines" ON public.quote_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can delete own quote_lines" ON public.quote_lines FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- Triggers for auto workshop_id
CREATE TRIGGER trg_set_workshop_id_quotes BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_quote_lines BEFORE INSERT ON public.quote_lines FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();

-- Updated_at trigger
CREATE TRIGGER trg_update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
