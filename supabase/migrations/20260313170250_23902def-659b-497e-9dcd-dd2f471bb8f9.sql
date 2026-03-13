ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS brand text,
ADD COLUMN IF NOT EXISTS model text;