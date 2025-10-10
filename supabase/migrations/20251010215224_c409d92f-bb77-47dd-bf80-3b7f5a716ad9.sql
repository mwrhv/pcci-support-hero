-- Update admin password and ensure admin role
DO $$
DECLARE
  admin_user_id uuid := '2640638b-96c1-40c9-90fc-6ebf521bce22';
BEGIN
  -- Update password
  UPDATE auth.users
  SET 
    encrypted_password = crypt('pcci', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
  WHERE id = admin_user_id;

  -- Ensure profile exists
  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (admin_user_id, 'Administrateur', 'admin@pcci.com', 'admin', true)
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = 'Administrateur',
    role = 'admin',
    is_active = true;

  -- Ensure admin role is assigned
  INSERT INTO public.user_roles (user_id, role)
  VALUES (admin_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Admin account configured successfully';
END $$;