-- Update existing admin user
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get the admin user ID
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@pcci.com';

  IF admin_user_id IS NOT NULL THEN
    -- Update profile to ensure it's active and has admin role
    UPDATE public.profiles
    SET role = 'admin', 
        is_active = true,
        full_name = COALESCE(full_name, 'Administrateur')
    WHERE id = admin_user_id;

    -- Assign admin role in user_roles table
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Admin role assigned successfully to user: %', admin_user_id;
  ELSE
    RAISE NOTICE 'User admin@pcci.com not found. Please create the account first via signup.';
  END IF;
END $$;