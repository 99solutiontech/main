-- COMPLETE CLEAN RESET
-- Step 1: Disable the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Clear all data completely
TRUNCATE TABLE public.admin_notifications CASCADE;
TRUNCATE TABLE public.transaction_history CASCADE;
TRUNCATE TABLE public.trading_history CASCADE;
TRUNCATE TABLE public.fund_data CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
DELETE FROM auth.users;

-- Step 3: Create the super admin user
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  phone_change,
  phone_change_token,
  email_change_token_current,
  reauthentication_token,
  is_super_admin,
  is_sso_user,
  is_anonymous,
  email_change_confirm_status,
  phone,
  phone_confirmed_at,
  phone_change_sent_at,
  email_change_sent_at,
  recovery_sent_at,
  confirmation_sent_at,
  invited_at,
  last_sign_in_at,
  banned_until,
  reauthentication_sent_at,
  deleted_at
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ceoserd@gmail.com',
  crypt('Mis@478992', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "CEO Admin", "trader_name": "CEOAdmin"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  false,
  false,
  false,
  0,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null
);

-- Step 4: Create the profile manually
INSERT INTO public.profiles (
  user_id,
  full_name,
  trader_name,
  registration_status,
  is_active,
  role
) 
SELECT 
  id,
  'CEO Admin',
  'CEOAdmin',
  'approved',
  true,
  'super_admin'
FROM auth.users 
WHERE email = 'ceoserd@gmail.com';

-- Step 5: Re-enable the trigger for future users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();