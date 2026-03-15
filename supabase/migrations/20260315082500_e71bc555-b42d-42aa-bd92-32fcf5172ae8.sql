
-- 1. Add owner_user_id to company_settings
ALTER TABLE public.company_settings 
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id);

-- Backfill owner_user_id from existing user_id
UPDATE public.company_settings SET owner_user_id = user_id WHERE owner_user_id IS NULL;

-- 2. Create security definer function to get workshop_id for current user
CREATE OR REPLACE FUNCTION public.get_my_workshop_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.company_settings 
  WHERE owner_user_id = auth.uid() 
  LIMIT 1
$$;

-- 3. Add workshop_id to all data tables
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.mechanics ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.invoice_lines ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.order_parts ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.parts_catalog ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.substitution_vehicles ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.appointment_photos ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);
ALTER TABLE public.invoice_series ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.company_settings(id);

-- 4. Backfill workshop_id for ALL existing data
UPDATE public.clients c SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = c.user_id LIMIT 1) WHERE c.workshop_id IS NULL;
UPDATE public.appointments a SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = a.user_id LIMIT 1) WHERE a.workshop_id IS NULL;
UPDATE public.mechanics m SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = m.user_id LIMIT 1) WHERE m.workshop_id IS NULL;
UPDATE public.work_orders w SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = w.user_id LIMIT 1) WHERE w.workshop_id IS NULL;
UPDATE public.invoices i SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = i.user_id LIMIT 1) WHERE i.workshop_id IS NULL;
UPDATE public.invoice_lines il SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = il.user_id LIMIT 1) WHERE il.workshop_id IS NULL;
UPDATE public.invoice_items ii SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = ii.user_id LIMIT 1) WHERE ii.workshop_id IS NULL;
UPDATE public.order_parts op SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = op.user_id LIMIT 1) WHERE op.workshop_id IS NULL;
UPDATE public.parts_catalog pc SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = pc.user_id LIMIT 1) WHERE pc.workshop_id IS NULL;
UPDATE public.substitution_vehicles sv SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = sv.user_id LIMIT 1) WHERE sv.workshop_id IS NULL;
UPDATE public.appointment_photos ap SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = ap.user_id LIMIT 1) WHERE ap.workshop_id IS NULL;
UPDATE public.invoice_series ise SET workshop_id = (SELECT id FROM public.company_settings cs WHERE cs.user_id = ise.user_id LIMIT 1) WHERE ise.workshop_id IS NULL;

-- 5. Create trigger function to auto-set workshop_id on insert
CREATE OR REPLACE FUNCTION public.set_workshop_id_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workshop_id IS NULL THEN
    NEW.workshop_id := public.get_my_workshop_id();
    IF NEW.workshop_id IS NULL AND NEW.user_id IS NOT NULL THEN
      NEW.workshop_id := (SELECT id FROM public.company_settings WHERE user_id = NEW.user_id LIMIT 1);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Create triggers on each table
CREATE TRIGGER set_workshop_id_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_appointments BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_mechanics BEFORE INSERT ON public.mechanics FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_work_orders BEFORE INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_invoices BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_invoice_lines BEFORE INSERT ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_invoice_items BEFORE INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_order_parts BEFORE INSERT ON public.order_parts FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_parts_catalog BEFORE INSERT ON public.parts_catalog FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_substitution_vehicles BEFORE INSERT ON public.substitution_vehicles FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_appointment_photos BEFORE INSERT ON public.appointment_photos FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER set_workshop_id_invoice_series BEFORE INSERT ON public.invoice_series FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
