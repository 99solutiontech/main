-- Update all user passwords to 'Mis@478992'
-- This uses Supabase's built-in password hashing function

UPDATE auth.users 
SET 
  encrypted_password = crypt('Mis@478992', gen_salt('bf')),
  updated_at = now()
WHERE email IS NOT NULL;

-- Also ensure all users are email confirmed for easier login
UPDATE auth.users 
SET 
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at = now()
WHERE email IS NOT NULL AND email_confirmed_at IS NULL;