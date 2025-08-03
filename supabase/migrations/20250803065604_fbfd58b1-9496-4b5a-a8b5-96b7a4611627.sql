-- Drop existing function and recreate it properly
DROP FUNCTION IF EXISTS public.get_profiles_by_email(text);

-- Create function to get profiles by email
CREATE OR REPLACE FUNCTION public.get_profiles_by_email(email_param text)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  full_name text,
  trader_name text,
  registration_status text,
  is_active boolean,
  role text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.trader_name,
    p.registration_status,
    p.is_active,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  INNER JOIN auth.users u ON p.user_id = u.id
  WHERE u.email = email_param;
END;
$$;