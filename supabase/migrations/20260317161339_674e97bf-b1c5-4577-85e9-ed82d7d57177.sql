
-- Create work_order_parts table to replace JSON-based parts in work_orders
CREATE TABLE public.work_order_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id UUID NOT NULL REFERENCES public.work_orders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC GENERATED ALWAYS AS (quantity * unit_price) STORED,
  user_id UUID NOT NULL,
  workshop_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Workshop can view own work_order_parts"
ON public.work_order_parts FOR SELECT TO authenticated
USING (workshop_id = get_my_workshop_id());

CREATE POLICY "Workshop can create own work_order_parts"
ON public.work_order_parts FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Workshop can update own work_order_parts"
ON public.work_order_parts FOR UPDATE TO authenticated
USING (workshop_id = get_my_workshop_id());

CREATE POLICY "Workshop can delete own work_order_parts"
ON public.work_order_parts FOR DELETE TO authenticated
USING (workshop_id = get_my_workshop_id());

-- Auto-assign workshop_id trigger
CREATE TRIGGER set_work_order_parts_workshop_id
BEFORE INSERT ON public.work_order_parts
FOR EACH ROW
EXECUTE FUNCTION public.set_workshop_id_trigger();
