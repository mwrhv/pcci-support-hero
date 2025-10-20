-- Fix: Remove SECURITY DEFINER from view (not needed for simple SELECT)
DROP VIEW IF EXISTS public.profiles_minimal;

CREATE VIEW public.profiles_minimal AS
SELECT 
  id,
  full_name,
  avatar_url
FROM public.profiles
WHERE is_active = true;