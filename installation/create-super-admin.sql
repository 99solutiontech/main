-- Create Super Admin User Script
-- Run this script AFTER creating your first user through Supabase Auth

-- Replace 'your-email@example.com' with the actual email of your admin user
-- This script will promote the user with the specified email to super_admin role

DO $$
DECLARE
    admin_email TEXT := 'your-email@example.com'; -- CHANGE THIS TO YOUR EMAIL
    admin_user_id UUID;
BEGIN
    -- Get user ID from auth.users table
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found. Please create the user first through Supabase Auth.', admin_email;
    END IF;
    
    -- Update the profile to super_admin role and activate the user
    UPDATE public.profiles 
    SET 
        role = 'super_admin',
        is_active = true,
        registration_status = 'approved',
        updated_at = now()
    WHERE user_id = admin_user_id;
    
    IF FOUND THEN
        RAISE NOTICE 'Successfully promoted user % to super_admin role', admin_email;
    ELSE
        RAISE EXCEPTION 'Profile not found for user %. The user may not have been properly created.', admin_email;
    END IF;
END $$;