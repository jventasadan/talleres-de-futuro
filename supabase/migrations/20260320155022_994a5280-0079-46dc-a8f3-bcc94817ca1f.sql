
-- Create work_order_items table
CREATE TABLE public.work_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  item_type TEXT NOT NULL DEFAULT 'pieza',
  user_id UUID NOT NULL,
  workshop_id UUID REFERENCES public.company_settings(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Workshop can view own work_order_items" ON public.work_order_items FOR SELECT TO authenticated USING (workshop_id = get_my_workshop_id());
CREATE POLICY "Workshop can create own work_order_items" ON public.work_order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Workshop can update own work_order_items" ON public.work_order_items FOR UPDATE TO authenticated USING (workshop_id = get_my_workshop_id());
CREATE POLICY "Workshop can delete own work_order_items" ON public.work_order_items FOR DELETE TO authenticated USING (workshop_id = get_my_workshop_id());

-- Trigger for auto workshop_id
CREATE TRIGGER set_work_order_items_workshop_id BEFORE INSERT ON public.work_order_items FOR EACH ROW EXECUTE FUNCTION public.set_workshop_id_trigger();

-- Add comentario_factura to work_orders
ALTER TABLE public.work_orders ADD COLUMN IF NOT EXISTS comentario_factura TEXT;
