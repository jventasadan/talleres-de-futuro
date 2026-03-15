
-- Create substitution_vehicles table with brand and delivery_date
CREATE TABLE IF NOT EXISTS public.substitution_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plate text NOT NULL DEFAULT '',
  brand text DEFAULT '',
  model text DEFAULT '',
  km text DEFAULT '',
  assigned_client text DEFAULT '',
  delivery_date text DEFAULT '',
  return_date text DEFAULT '',
  status text DEFAULT 'disponible',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.substitution_vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vehicles" ON public.substitution_vehicles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own vehicles" ON public.substitution_vehicles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vehicles" ON public.substitution_vehicles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vehicles" ON public.substitution_vehicles FOR DELETE USING (auth.uid() = user_id);

-- Create parts_catalog table
CREATE TABLE IF NOT EXISTS public.parts_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  ref text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ref)
);

ALTER TABLE public.parts_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own parts_catalog" ON public.parts_catalog FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own parts_catalog" ON public.parts_catalog FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own parts_catalog" ON public.parts_catalog FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own parts_catalog" ON public.parts_catalog FOR DELETE USING (auth.uid() = user_id);
