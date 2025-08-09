-- Drop the existing trigger first, then recreate with new table reference
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Update the trigger function to use new table
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, trader_name, registration_status, is_active)
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

-- Recreate trigger for new user registration
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_user_registration();