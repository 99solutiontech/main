-- Fix infinite recursion by creating a security definer function
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Return the role of the current authenticated user
  -- This function runs with elevated privileges to avoid RLS recursion
  RETURN (
    SELECT role 
    FROM public.profiles 
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Drop and recreate the problematic policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create new policies using the security definer function
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update admin policies for other tables to use the function
DROP POLICY IF EXISTS "Admins can view all fund data" ON public.fund_data;
CREATE POLICY "Admins can view all fund data" 
ON public.fund_data 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can view all trading history" ON public.trading_history;
CREATE POLICY "Admins can view all trading history" 
ON public.trading_history 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can view all transaction history" ON public.transaction_history;
CREATE POLICY "Admins can view all transaction history" 
ON public.transaction_history 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can view all notifications" ON public.admin_notifications;
CREATE POLICY "Admins can view all notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));

DROP POLICY IF EXISTS "Admins can update notifications" ON public.admin_notifications;
CREATE POLICY "Admins can update notifications" 
ON public.admin_notifications 
FOR UPDATE 
USING (public.get_current_user_role() IN ('admin', 'super_admin'));