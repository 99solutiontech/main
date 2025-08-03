-- Fix search path security warnings
CREATE OR REPLACE FUNCTION get_profiles_by_email(email_param TEXT)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  full_name TEXT,
  trader_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  registration_status TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.trader_name,
    p.role,
    p.is_active,
    p.created_at,
    p.registration_status
  FROM public.profiles p
  JOIN auth.users u ON p.user_id = u.id
  WHERE u.email = email_param;
END;
$$;

-- Update the existing function too
CREATE OR REPLACE FUNCTION public.get_current_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;