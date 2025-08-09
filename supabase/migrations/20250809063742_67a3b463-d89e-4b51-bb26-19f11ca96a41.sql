-- Enable the pgcrypto extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix auth issues by ensuring all required fields are correct (without touching generated columns)
UPDATE auth.users 
SET 
  aud = 'authenticated',
  role = 'authenticated',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'),
  is_super_admin = false,
  is_sso_user = false,
  is_anonymous = false
WHERE email IS NOT NULL;

-- Now properly update passwords with working crypt function
UPDATE auth.users 
SET encrypted_password = crypt('Mis@478992', gen_salt('bf'))
WHERE email IS NOT NULL;