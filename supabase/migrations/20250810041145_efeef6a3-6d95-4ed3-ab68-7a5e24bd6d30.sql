-- Promote ceoserd@gmail.com to super_admin and approve account
DO $$
DECLARE
  u_id uuid;
BEGIN
  SELECT id INTO u_id FROM auth.users WHERE lower(email) = lower('ceoserd@gmail.com') LIMIT 1;

  IF u_id IS NULL THEN
    RAISE NOTICE 'No auth user found for ceoserd@gmail.com. Please sign up first, then run again.';
  ELSE
    INSERT INTO public.profiles (user_id, email, full_name, trader_name, role, status)
    VALUES (u_id, 'ceoserd@gmail.com', 'Super Admin', 'Admin', 'super_admin', 'approved')
    ON CONFLICT (user_id) DO UPDATE SET
      role = 'super_admin',
      status = 'approved',
      full_name = COALESCE(excluded.full_name, profiles.full_name),
      trader_name = COALESCE(excluded.trader_name, profiles.trader_name);
  END IF;
END $$;