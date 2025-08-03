-- Add registration_status column to profiles table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'registration_status'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN registration_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Update Supabase auth settings to disable email confirmation
-- This requires modifying the auth.config table if accessible
UPDATE auth.config SET email_confirm_required = false WHERE id = 1;