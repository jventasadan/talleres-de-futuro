CREATE OR REPLACE TRIGGER on_auth_user_created_company_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_company_settings();