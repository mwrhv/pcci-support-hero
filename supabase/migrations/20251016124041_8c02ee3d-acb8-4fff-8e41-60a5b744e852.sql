-- Corriger les fonctions avec search_path mutable
ALTER FUNCTION public.generate_ticket_code() SET search_path = public;
ALTER FUNCTION public.set_ticket_code() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.log_audit_event() SET search_path = public;
ALTER FUNCTION public.log_login_attempt(TEXT, BOOLEAN, TEXT) SET search_path = public;