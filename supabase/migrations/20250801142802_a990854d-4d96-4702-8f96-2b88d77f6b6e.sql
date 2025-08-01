-- Remove the unique constraint that's causing issues with sub-users
-- and add a proper unique constraint that includes sub_user_name
ALTER TABLE public.fund_data DROP CONSTRAINT IF EXISTS fund_data_user_id_mode_key;

-- Add a new unique constraint that allows multiple sub-users per user/mode
ALTER TABLE public.fund_data ADD CONSTRAINT fund_data_user_mode_subuser_unique 
UNIQUE (user_id, mode, COALESCE(sub_user_name, ''));

-- Also ensure sub_user_name column exists and is properly set up
ALTER TABLE public.fund_data ALTER COLUMN sub_user_name SET DEFAULT NULL;