-- COMPLETE DATABASE RESET AND REBUILD
-- Step 1: Clear all existing data

-- Delete all existing data from public tables
TRUNCATE TABLE public.admin_notifications CASCADE;
TRUNCATE TABLE public.transaction_history CASCADE;
TRUNCATE TABLE public.trading_history CASCADE;
TRUNCATE TABLE public.fund_data CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Delete all existing users from auth.users
DELETE FROM auth.users;

-- Step 2: Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 3: Create the super admin user with proper authentication
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at,
  is_anonymous
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'ceoserd@gmail.com',
  crypt('Mis@478992', gen_salt('bf')),
  now(),
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
  null,
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "CEO Admin", "trader_name": "CEOAdmin"}'::jsonb,
  false,
  now(),
  now(),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null,
  false,
  null,
  false
);

-- Step 4: Create the profile for the super admin
INSERT INTO public.profiles (
  user_id,
  full_name,
  trader_name,
  registration_status,
  is_active,
  role,
  created_at,
  updated_at
) 
SELECT 
  id,
  'CEO Admin',
  'CEOAdmin',
  'approved',
  true,
  'super_admin',
  now(),
  now()
FROM auth.users 
WHERE email = 'ceoserd@gmail.com';

-- Step 5: Create initial fund data for the super admin
INSERT INTO public.fund_data (
  user_id,
  mode,
  initial_capital,
  total_capital,
  active_fund,
  reserve_fund,
  profit_fund,
  target_reserve_fund,
  created_at,
  updated_at
)
SELECT 
  id,
  'live',
  10000.00,
  10000.00,
  10000.00,
  0.00,
  0.00,
  5000.00,
  now(),
  now()
FROM auth.users 
WHERE email = 'ceoserd@gmail.com';