-- Fix security issues with profiles table RLS policies
-- Add missing admin policies for comprehensive user management

-- Allow admins to insert profiles (for admin user creation/management)
CREATE POLICY "Admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (get_current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- Allow admins to delete profiles (for admin user management)
CREATE POLICY "Admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- Fix user_settings table to allow admin access for support
-- Allow admins to view all user settings
CREATE POLICY "Admins can view all user settings" 
ON public.user_settings 
FOR SELECT 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));

-- Allow admins to update user settings for support purposes  
CREATE POLICY "Admins can update all user settings" 
ON public.user_settings 
FOR UPDATE 
USING (get_current_user_role() = ANY (ARRAY['admin'::text, 'super_admin'::text]));