ALTER TABLE public.company_settings
ADD COLUMN IF NOT EXISTS opening_time TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS closing_time TEXT DEFAULT '';