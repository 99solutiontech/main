-- Update the handle_new_user function to set proper defaults for new registrations
-- This will ensure new users start as pending and inactive
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
    'pending',  -- Always start as pending
    false       -- Always start as inactive
  );
  RETURN NEW;
END;
$$;