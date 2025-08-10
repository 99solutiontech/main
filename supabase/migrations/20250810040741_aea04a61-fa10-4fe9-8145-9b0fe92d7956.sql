-- Create or update the first user (ceoserd@gmail.com) as super admin
-- First, let's check if there are any auth users and create a profile for the first one

-- Create a super admin user profile for ceoserd@gmail.com
-- We'll need to do this through auth.users first, then update the profile

DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if there are any existing auth users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'ceoserd@gmail.com' LIMIT 1;
    
    -- If the user exists, update their profile
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, email, full_name, role, status, trader_name)
        VALUES (admin_user_id, 'ceoserd@gmail.com', 'CEO Admin', 'super_admin', 'approved', 'CEOTrader')
        ON CONFLICT (user_id) DO UPDATE SET
            role = 'super_admin',
            status = 'approved',
            trader_name = COALESCE(profiles.trader_name, 'CEOTrader'),
            full_name = COALESCE(profiles.full_name, 'CEO Admin');
        
        RAISE NOTICE 'Updated existing user ceoserd@gmail.com to super_admin';
    ELSE
        RAISE NOTICE 'No user found with email ceoserd@gmail.com. Please sign up first, then I can make you super admin.';
    END IF;
END $$;