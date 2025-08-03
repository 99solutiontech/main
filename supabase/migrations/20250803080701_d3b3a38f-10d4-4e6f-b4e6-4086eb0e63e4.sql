-- Fix the trigger by removing the problematic auth.users update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Only insert the profile, don't try to update auth.users
  INSERT INTO public.profiles (user_id, full_name, trader_name, registration_status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'trader_name', 'Trader_' || substr(NEW.id::text, 1, 8)),
    'pending',  -- Always start as pending
    false       -- Always start as inactive
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    trader_name = EXCLUDED.trader_name,
    registration_status = 'pending',
    is_active = false;
  
  RETURN NEW;
END;
$$;