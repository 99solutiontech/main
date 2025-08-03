-- Create admin_notifications table for registration requests
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  trader_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin notifications
CREATE POLICY "Super admins can view all notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'super_admin'
));

CREATE POLICY "System can insert notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (true);

-- Add registration_status column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'registration_status'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN registration_status TEXT DEFAULT 'approved';
  END IF;
END $$;