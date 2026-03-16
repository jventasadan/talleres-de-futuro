-- Add work_order_id to invoices table (keep appointment_id for backward compat)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS work_order_id uuid REFERENCES public.work_orders(id);

-- Make appointment_id nullable so we can create invoices without it
ALTER TABLE public.invoices ALTER COLUMN appointment_id DROP NOT NULL;