-- Fix potential auth issues by ensuring all required fields are correct
UPDATE auth.users 
SET 
  aud = 'authenticated',
  role = 'authenticated',
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  confirmed_at = COALESCE(confirmed_at, now()),
  raw_app_meta_data = COALESCE(raw_app_meta_data, '{"provider": "email", "providers": ["email"]}'),
  is_super_admin = false,
  is_sso_user = false,
  is_anonymous = false
WHERE email IS NOT NULL;