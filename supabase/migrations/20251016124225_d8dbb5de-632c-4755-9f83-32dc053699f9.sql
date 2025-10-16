-- Corriger les 2 dernières fonctions avec search_path

-- 1. Corriger la fonction generate_ticket_code
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  new_code TEXT;
BEGIN
  year_month := TO_CHAR(now(), 'YYYYMM');
  
  -- Get the next sequence number for this month
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(code FROM 'HD-[0-9]{6}-([0-9]{4})') AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM public.tickets
  WHERE code LIKE 'HD-' || year_month || '-%';
  
  new_code := 'HD-' || year_month || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_code;
END;
$$;

-- 2. Corriger la fonction set_ticket_code
CREATE OR REPLACE FUNCTION public.set_ticket_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_ticket_code();
  END IF;
  RETURN NEW;
END;
$$;