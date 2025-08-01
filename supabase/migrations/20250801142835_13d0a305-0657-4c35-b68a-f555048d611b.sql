-- Remove the unique constraint that's causing issues with sub-users
ALTER TABLE public.fund_data DROP CONSTRAINT IF EXISTS fund_data_user_id_mode_key;

-- Add a new unique constraint that allows multiple sub-users per user/mode
-- We'll create a partial unique index instead to handle NULL values properly
CREATE UNIQUE INDEX IF NOT EXISTS fund_data_user_mode_subuser_unique_idx 
ON public.fund_data (user_id, mode, sub_user_name) 
WHERE sub_user_name IS NOT NULL;

-- Create another unique index for the main account (where sub_user_name IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS fund_data_user_mode_main_unique_idx 
ON public.fund_data (user_id, mode) 
WHERE sub_user_name IS NULL;