-- Drop the problematic trigger and recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
DROP FUNCTION IF EXISTS public.auto_confirm_user();

-- Update the handle_new_user function to be more robust and handle auto-confirmation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Auto-confirm the user's email since we use admin approval instead
  UPDATE auth.users 
  SET email_confirmed_at = COALESCE(email_confirmed_at, now()), 
      confirmed_at = COALESCE(confirmed_at, now())
  WHERE id = NEW.id;
  
  -- Insert profile with proper defaults
  INSERT INTO public.profiles (user_id, full_name, trader_name, registration_status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'trader_name', 'Trader_' || substr(NEW.id::text, 1, 8)),
    'pending',  -- Always start as pending
    false       -- Always start as inactive
  )
  ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate insertion errors
  
  RETURN NEW;
END;
$$;