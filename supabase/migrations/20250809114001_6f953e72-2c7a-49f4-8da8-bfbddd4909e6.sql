-- Fix order: drop old trigger first, then create required objects

-- 1) Drop existing trigger that references the outdated function, if present
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 2) Ensure a unique index on profiles.user_id so ON CONFLICT works
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON public.profiles(user_id);

-- 3) Create/replace the function that inserts a profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, trader_name, registration_status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'trader_name', 'Trader_' || substr(NEW.id::text, 1, 8)),
    'pending',
    false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    trader_name = EXCLUDED.trader_name,
    registration_status = 'pending',
    is_active = false;

  RETURN NEW;
END;
$$;

-- 4) Remove the outdated registration function (no longer needed)
DROP FUNCTION IF EXISTS public.handle_user_registration();

-- 5) Recreate the trigger to use the new function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();