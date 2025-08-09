-- Create new tables with different names to bypass existing data conflicts

-- New profiles table
CREATE TABLE public.user_profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  full_name text,
  trader_name text NOT NULL,
  role text DEFAULT 'user'::text,
  registration_status text DEFAULT 'approved'::text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- New fund data table
CREATE TABLE public.trading_funds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mode text NOT NULL,
  sub_user_name text,
  initial_capital numeric NOT NULL DEFAULT 0,
  total_capital numeric NOT NULL DEFAULT 0,
  active_fund numeric NOT NULL DEFAULT 0,
  reserve_fund numeric NOT NULL DEFAULT 0,
  profit_fund numeric NOT NULL DEFAULT 0,
  target_reserve_fund numeric NOT NULL DEFAULT 0,
  risk_percent numeric DEFAULT 40,
  lot_base_capital numeric DEFAULT 1000,
  lot_base_lot numeric DEFAULT 0.40,
  profit_dist_profit integer DEFAULT 25,
  profit_dist_reserve integer DEFAULT 25,
  profit_dist_active integer DEFAULT 50,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- New trading history table
CREATE TABLE public.trade_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mode text NOT NULL,
  type text NOT NULL,
  details text NOT NULL,
  amount numeric,
  end_balance numeric NOT NULL,
  trade_date date,
  sub_user_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- New transaction history table
CREATE TABLE public.fund_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mode text NOT NULL,
  transaction_type text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  balance_before numeric NOT NULL,
  balance_after numeric NOT NULL,
  from_fund text,
  to_fund text,
  sub_user_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- New admin notifications table
CREATE TABLE public.system_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  trader_name text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_notifications ENABLE ROW LEVEL SECURITY;

-- Create updated function for user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- Create function to get profiles by email (updated)
CREATE OR REPLACE FUNCTION public.get_user_profiles_by_email(email_param text)
RETURNS TABLE(id uuid, user_id uuid, full_name text, trader_name text, registration_status text, is_active boolean, role text, created_at timestamp with time zone, updated_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.user_id,
    p.full_name,
    p.trader_name,
    p.registration_status,
    p.is_active,
    p.role,
    p.created_at,
    p.updated_at
  FROM public.user_profiles p
  INNER JOIN auth.users u ON p.user_id = u.id
  WHERE u.email = email_param;
END;
$$;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" 
ON public.user_profiles 
FOR ALL 
USING (get_user_role() = 'super_admin'::text);

-- RLS Policies for trading_funds
CREATE POLICY "Users can manage their own fund data" 
ON public.trading_funds 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all fund data" 
ON public.trading_funds 
FOR SELECT 
USING (get_user_role() = 'super_admin'::text);

-- RLS Policies for trade_records
CREATE POLICY "Users can manage their own trading history" 
ON public.trade_records 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all trading history" 
ON public.trade_records 
FOR SELECT 
USING (get_user_role() = 'super_admin'::text);

-- RLS Policies for fund_transactions
CREATE POLICY "Users can view their own transaction history" 
ON public.fund_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction history" 
ON public.fund_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all transaction history" 
ON public.fund_transactions 
FOR SELECT 
USING (get_user_role() = 'super_admin'::text);

-- RLS Policies for system_notifications
CREATE POLICY "Super admins can view all notifications" 
ON public.system_notifications 
FOR SELECT 
USING (get_user_role() = 'super_admin'::text);

CREATE POLICY "System can insert notifications" 
ON public.system_notifications 
FOR INSERT 
WITH CHECK (true);

-- Create trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_timestamp_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for timestamp updates
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();

CREATE TRIGGER update_trading_funds_updated_at
BEFORE UPDATE ON public.trading_funds
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp_column();

-- Create trigger for new user profile creation
CREATE OR REPLACE FUNCTION public.handle_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, trader_name, registration_status, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'trader_name', 'Trader_' || substr(NEW.id::text, 1, 8)),
    'pending',
    false
  )
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    trader_name = EXCLUDED.trader_name,
    registration_status = 'pending',
    is_active = false;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_user_registration();