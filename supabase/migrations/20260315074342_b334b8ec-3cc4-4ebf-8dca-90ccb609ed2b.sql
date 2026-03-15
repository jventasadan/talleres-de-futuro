
-- Enable RLS on company_settings (it was disabled)
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them properly
DROP POLICY IF EXISTS "Users can view own company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can create own company_settings" ON public.company_settings;
DROP POLICY IF EXISTS "Users can update own company_settings" ON public.company_settings;

CREATE POLICY "Users can view own company_settings" ON public.company_settings
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own company_settings" ON public.company_settings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company_settings" ON public.company_settings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
