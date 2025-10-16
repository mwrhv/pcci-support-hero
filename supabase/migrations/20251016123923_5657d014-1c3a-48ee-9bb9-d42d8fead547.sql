-- Créer une fonction pour enregistrer les logs d'audit automatiquement
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les triggers pour les tables importantes

-- Trigger pour les tickets
DROP TRIGGER IF EXISTS audit_tickets_changes ON public.tickets;
CREATE TRIGGER audit_tickets_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event('ticket_modified');

-- Trigger pour les profiles
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event('profile_modified');

-- Trigger pour les user_roles
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event('role_modified');

-- Trigger pour les assets
DROP TRIGGER IF EXISTS audit_assets_changes ON public.assets;
CREATE TRIGGER audit_assets_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event('asset_modified');

-- Fonction pour enregistrer les tentatives de connexion
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ajouter un index sur actor_id et created_at pour améliorer les performances des requêtes de logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created 
  ON public.audit_logs(actor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
  ON public.audit_logs(entity_type, entity_id);

-- Commentaires pour la documentation
COMMENT ON FUNCTION public.log_audit_event() IS 
  'Fonction trigger pour enregistrer automatiquement les modifications dans audit_logs';

COMMENT ON FUNCTION public.log_login_attempt(TEXT, BOOLEAN, TEXT) IS 
  'Fonction pour enregistrer les tentatives de connexion (succès et échecs)';