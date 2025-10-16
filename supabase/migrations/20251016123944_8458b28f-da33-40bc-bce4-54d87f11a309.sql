-- Corriger les problèmes de sécurité détectés par le linter

-- 1. Définir search_path pour la fonction log_audit_event
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Pour les INSERT
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata_json
    ) VALUES (
      auth.uid(),
      TG_ARGV[0],
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'operation', 'INSERT',
        'new_data', row_to_json(NEW)
      )
    );
    RETURN NEW;
  
  -- Pour les UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata_json
    ) VALUES (
      auth.uid(),
      TG_ARGV[0],
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object(
        'operation', 'UPDATE',
        'old_data', row_to_json(OLD),
        'new_data', row_to_json(NEW)
      )
    );
    RETURN NEW;
  
  -- Pour les DELETE
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      metadata_json
    ) VALUES (
      auth.uid(),
      TG_ARGV[0],
      TG_TABLE_NAME,
      OLD.id,
      jsonb_build_object(
        'operation', 'DELETE',
        'old_data', row_to_json(OLD)
      )
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Définir search_path pour la fonction log_login_attempt
CREATE OR REPLACE FUNCTION public.log_login_attempt(
  user_email TEXT,
  success BOOLEAN,
  ip_address TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  user_id_var UUID;
BEGIN
  -- Obtenir l'ID utilisateur si la connexion a réussi
  IF success THEN
    SELECT id INTO user_id_var
    FROM auth.users
    WHERE email = user_email
    LIMIT 1;
  END IF;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata_json
  ) VALUES (
    user_id_var,
    CASE WHEN success THEN 'login_success' ELSE 'login_failed' END,
    'auth',
    COALESCE(user_id_var, gen_random_uuid()),
    jsonb_build_object(
      'email', user_email,
      'success', success,
      'ip_address', ip_address,
      'timestamp', now()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;