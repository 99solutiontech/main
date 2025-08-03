-- Create a trigger to automatically confirm email for new users since we're using admin approval flow
CREATE OR REPLACE FUNCTION public.auto_confirm_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Update the user's email confirmation in auth.users
  UPDATE auth.users 
  SET email_confirmed_at = now(), 
      confirmed_at = now()
  WHERE id = NEW.id 
    AND email_confirmed_at IS NULL;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-confirm emails on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.auto_confirm_user();