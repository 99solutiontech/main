-- Add profile fields and preferences for user settings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS currency_unit text DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en';

-- Optional: create indexes for frequent lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
