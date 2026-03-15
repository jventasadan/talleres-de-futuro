
CREATE TRIGGER trg_set_workshop_id_clients
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_work_orders
  BEFORE INSERT ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_appointments
  BEFORE INSERT ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_mechanics
  BEFORE INSERT ON public.mechanics
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_invoices
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_invoice_items
  BEFORE INSERT ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_invoice_lines
  BEFORE INSERT ON public.invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_order_parts
  BEFORE INSERT ON public.order_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_appointment_photos
  BEFORE INSERT ON public.appointment_photos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_parts_catalog
  BEFORE INSERT ON public.parts_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_substitution_vehicles
  BEFORE INSERT ON public.substitution_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();

CREATE TRIGGER trg_set_workshop_id_invoice_series
  BEFORE INSERT ON public.invoice_series
  FOR EACH ROW
  EXECUTE FUNCTION public.set_workshop_id_trigger();
