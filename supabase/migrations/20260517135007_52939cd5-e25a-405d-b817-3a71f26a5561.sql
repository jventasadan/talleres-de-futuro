
-- 1) Eliminar CHECK constraints obsoletos que bloquean inserts válidos
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_created_by_check;
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- 2) Permitir que user_id sea NULL y se rellene por el trigger
ALTER TABLE public.appointments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;

-- 3) Actualizar el trigger para que también rellene user_id desde auth.uid()
CREATE OR REPLACE FUNCTION public.set_workshop_id_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  IF NEW.workshop_id IS NULL THEN
    NEW.workshop_id := public.get_my_workshop_id();
    IF NEW.workshop_id IS NULL AND NEW.user_id IS NOT NULL THEN
      NEW.workshop_id := (SELECT id FROM public.company_settings WHERE user_id = NEW.user_id LIMIT 1);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
