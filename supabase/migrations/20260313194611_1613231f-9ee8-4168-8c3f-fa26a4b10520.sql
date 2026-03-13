
-- Create workshop_settings table
CREATE TABLE public.workshop_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workshop_name text DEFAULT '',
  cif text DEFAULT '',
  address text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  labor_rate numeric DEFAULT 35,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.workshop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings" ON public.workshop_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.workshop_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.workshop_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create mechanics table
CREATE TABLE public.mechanics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mechanics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mechanics" ON public.mechanics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own mechanics" ON public.mechanics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own mechanics" ON public.mechanics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own mechanics" ON public.mechanics FOR DELETE USING (auth.uid() = user_id);

-- Create appointment_photos table
CREATE TABLE public.appointment_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointment_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos" ON public.appointment_photos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own photos" ON public.appointment_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON public.appointment_photos FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for appointment photos
INSERT INTO storage.buckets (id, name, public) VALUES ('appointment-photos', 'appointment-photos', true);

CREATE POLICY "Users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'appointment-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view photos" ON storage.objects FOR SELECT USING (bucket_id = 'appointment-photos');
CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE USING (bucket_id = 'appointment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add mechanic_id column to appointments if not exists
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS mechanic_id uuid REFERENCES public.mechanics(id);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
