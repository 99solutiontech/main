-- Add missing fields to fund_data table
ALTER TABLE public.fund_data 
ADD COLUMN profit_dist_active numeric DEFAULT 50,
ADD COLUMN profit_dist_reserve numeric DEFAULT 25,
ADD COLUMN profit_dist_profit numeric DEFAULT 25,
ADD COLUMN lot_base_capital numeric DEFAULT 1000,
ADD COLUMN lot_base_lot numeric DEFAULT 0.01;

-- Add missing fields to trading_history table
ALTER TABLE public.trading_history 
ADD COLUMN details text;

-- Add missing field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN trader_name text;

-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  trader_name text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for admin_notifications
CREATE POLICY "Admins can view all notifications" 
ON public.admin_notifications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'super_admin')
));

CREATE POLICY "System can insert notifications" 
ON public.admin_notifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update notifications" 
ON public.admin_notifications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'super_admin')
));

-- Add trigger for admin_notifications
CREATE TRIGGER update_admin_notifications_updated_at
BEFORE UPDATE ON public.admin_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();