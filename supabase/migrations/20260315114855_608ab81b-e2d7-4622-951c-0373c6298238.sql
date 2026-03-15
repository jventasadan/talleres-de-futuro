
-- Re-create triggers (DROP IF EXISTS to avoid conflicts)
DROP TRIGGER IF EXISTS trg_set_workshop_id_clients ON public.clients;
DROP TRIGGER IF EXISTS trg_set_workshop_id_work_orders ON public.work_orders;
DROP TRIGGER IF EXISTS trg_set_workshop_id_appointments ON public.appointments;
DROP TRIGGER IF EXISTS trg_set_workshop_id_mechanics ON public.mechanics;
DROP TRIGGER IF EXISTS trg_set_workshop_id_invoices ON public.invoices;
DROP TRIGGER IF EXISTS trg_set_workshop_id_invoice_items ON public.invoice_items;
DROP TRIGGER IF EXISTS trg_set_workshop_id_invoice_lines ON public.invoice_lines;
DROP TRIGGER IF EXISTS trg_set_workshop_id_order_parts ON public.order_parts;
DROP TRIGGER IF EXISTS trg_set_workshop_id_appointment_photos ON public.appointment_photos;
DROP TRIGGER IF EXISTS trg_set_workshop_id_parts_catalog ON public.parts_catalog;
DROP TRIGGER IF EXISTS trg_set_workshop_id_substitution_vehicles ON public.substitution_vehicles;
DROP TRIGGER IF EXISTS trg_set_workshop_id_invoice_series ON public.invoice_series;

CREATE TRIGGER trg_set_workshop_id_clients BEFORE INSERT ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_work_orders BEFORE INSERT ON public.work_orders FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_appointments BEFORE INSERT ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_mechanics BEFORE INSERT ON public.mechanics FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_invoices BEFORE INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_invoice_items BEFORE INSERT ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_invoice_lines BEFORE INSERT ON public.invoice_lines FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_order_parts BEFORE INSERT ON public.order_parts FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_appointment_photos BEFORE INSERT ON public.appointment_photos FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_parts_catalog BEFORE INSERT ON public.parts_catalog FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_substitution_vehicles BEFORE INSERT ON public.substitution_vehicles FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();
CREATE TRIGGER trg_set_workshop_id_invoice_series BEFORE INSERT ON public.invoice_series FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();

-- Update RLS policies to use workshop_id instead of user_id for data isolation
-- CLIENTS
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Workshop can view own clients" ON public.clients FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own clients" ON public.clients FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own clients" ON public.clients FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- APPOINTMENTS
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete their own appointments" ON public.appointments;

CREATE POLICY "Workshop can view own appointments" ON public.appointments FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own appointments" ON public.appointments FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own appointments" ON public.appointments FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- MECHANICS
DROP POLICY IF EXISTS "Users can view their own mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Users can create their own mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Users can update their own mechanics" ON public.mechanics;
DROP POLICY IF EXISTS "Users can delete their own mechanics" ON public.mechanics;

CREATE POLICY "Workshop can view own mechanics" ON public.mechanics FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own mechanics" ON public.mechanics FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own mechanics" ON public.mechanics FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own mechanics" ON public.mechanics FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- INVOICES
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can create their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON public.invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON public.invoices;

CREATE POLICY "Workshop can view own invoices" ON public.invoices FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own invoices" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own invoices" ON public.invoices FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own invoices" ON public.invoices FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- INVOICE_ITEMS
DROP POLICY IF EXISTS "Users can view own invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can create own invoice_items" ON public.invoice_items;
DROP POLICY IF EXISTS "Users can delete own invoice_items" ON public.invoice_items;

CREATE POLICY "Workshop can view own invoice_items" ON public.invoice_items FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own invoice_items" ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can delete own invoice_items" ON public.invoice_items FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- INVOICE_LINES
DROP POLICY IF EXISTS "Users can view own invoice_lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can create own invoice_lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Users can delete own invoice_lines" ON public.invoice_lines;

CREATE POLICY "Workshop can view own invoice_lines" ON public.invoice_lines FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own invoice_lines" ON public.invoice_lines FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can delete own invoice_lines" ON public.invoice_lines FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- WORK_ORDERS
DROP POLICY IF EXISTS "Users can view own work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can create own work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can update own work_orders" ON public.work_orders;
DROP POLICY IF EXISTS "Users can delete own work_orders" ON public.work_orders;

CREATE POLICY "Workshop can view own work_orders" ON public.work_orders FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own work_orders" ON public.work_orders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own work_orders" ON public.work_orders FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own work_orders" ON public.work_orders FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- ORDER_PARTS
DROP POLICY IF EXISTS "Users can view their own parts" ON public.order_parts;
DROP POLICY IF EXISTS "Users can create their own parts" ON public.order_parts;
DROP POLICY IF EXISTS "Users can update their own parts" ON public.order_parts;
DROP POLICY IF EXISTS "Users can delete their own parts" ON public.order_parts;

CREATE POLICY "Workshop can view own order_parts" ON public.order_parts FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own order_parts" ON public.order_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own order_parts" ON public.order_parts FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own order_parts" ON public.order_parts FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- APPOINTMENT_PHOTOS
DROP POLICY IF EXISTS "Users can view their own photos" ON public.appointment_photos;
DROP POLICY IF EXISTS "Users can create their own photos" ON public.appointment_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.appointment_photos;

CREATE POLICY "Workshop can view own photos" ON public.appointment_photos FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own photos" ON public.appointment_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can delete own photos" ON public.appointment_photos FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- PARTS_CATALOG
DROP POLICY IF EXISTS "Users can view own parts_catalog" ON public.parts_catalog;
DROP POLICY IF EXISTS "Users can create own parts_catalog" ON public.parts_catalog;
DROP POLICY IF EXISTS "Users can update own parts_catalog" ON public.parts_catalog;
DROP POLICY IF EXISTS "Users can delete own parts_catalog" ON public.parts_catalog;

CREATE POLICY "Workshop can view own parts_catalog" ON public.parts_catalog FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own parts_catalog" ON public.parts_catalog FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own parts_catalog" ON public.parts_catalog FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own parts_catalog" ON public.parts_catalog FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- SUBSTITUTION_VEHICLES
DROP POLICY IF EXISTS "Users can view own vehicles" ON public.substitution_vehicles;
DROP POLICY IF EXISTS "Users can create own vehicles" ON public.substitution_vehicles;
DROP POLICY IF EXISTS "Users can update own vehicles" ON public.substitution_vehicles;
DROP POLICY IF EXISTS "Users can delete own vehicles" ON public.substitution_vehicles;

CREATE POLICY "Workshop can view own vehicles" ON public.substitution_vehicles FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own vehicles" ON public.substitution_vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own vehicles" ON public.substitution_vehicles FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can delete own vehicles" ON public.substitution_vehicles FOR DELETE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- INVOICE_SERIES
DROP POLICY IF EXISTS "Users can view own invoice_series" ON public.invoice_series;
DROP POLICY IF EXISTS "Users can create own invoice_series" ON public.invoice_series;
DROP POLICY IF EXISTS "Users can update own invoice_series" ON public.invoice_series;

CREATE POLICY "Workshop can view own invoice_series" ON public.invoice_series FOR SELECT TO authenticated USING (workshop_id = public.get_my_workshop_id());
CREATE POLICY "Workshop can create own invoice_series" ON public.invoice_series FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own invoice_series" ON public.invoice_series FOR UPDATE TO authenticated USING (workshop_id = public.get_my_workshop_id());

-- Backfill workshop_id for existing records that have user_id but no workshop_id
UPDATE public.clients SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = clients.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.appointments SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = appointments.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.mechanics SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = mechanics.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.invoices SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = invoices.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.invoice_items SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = invoice_items.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.invoice_lines SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = invoice_lines.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.work_orders SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = work_orders.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.order_parts SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = order_parts.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.appointment_photos SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = appointment_photos.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.parts_catalog SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = parts_catalog.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.substitution_vehicles SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = substitution_vehicles.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
UPDATE public.invoice_series SET workshop_id = (SELECT id FROM public.company_settings WHERE owner_user_id = invoice_series.user_id LIMIT 1) WHERE workshop_id IS NULL AND user_id IS NOT NULL;
