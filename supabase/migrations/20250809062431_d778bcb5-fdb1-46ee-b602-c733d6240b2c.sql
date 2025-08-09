-- Create the profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  trader_name TEXT NOT NULL,
  registration_status TEXT DEFAULT 'approved',
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create the fund_data table
CREATE TABLE public.fund_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  sub_user_name TEXT,
  initial_capital NUMERIC NOT NULL DEFAULT 0,
  total_capital NUMERIC NOT NULL DEFAULT 0,
  active_fund NUMERIC NOT NULL DEFAULT 0,
  reserve_fund NUMERIC NOT NULL DEFAULT 0,
  profit_fund NUMERIC NOT NULL DEFAULT 0,
  target_reserve_fund NUMERIC NOT NULL DEFAULT 0,
  risk_percent NUMERIC DEFAULT 40,
  lot_base_capital NUMERIC DEFAULT 1000,
  lot_base_lot NUMERIC DEFAULT 0.40,
  profit_dist_profit INTEGER DEFAULT 25,
  profit_dist_reserve INTEGER DEFAULT 25,
  profit_dist_active INTEGER DEFAULT 50,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on fund_data
ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;

-- Create the trading_history table
CREATE TABLE public.trading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  sub_user_name TEXT,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  amount NUMERIC,
  end_balance NUMERIC NOT NULL,
  trade_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on trading_history
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;

-- Create the transaction_history table
CREATE TABLE public.transaction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL,
  sub_user_name TEXT,
  transaction_type TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  balance_before NUMERIC NOT NULL,
  balance_after NUMERIC NOT NULL,
  from_fund TEXT,
  to_fund TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on transaction_history
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;

-- Create the admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  trader_name TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_notifications
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, trader_name, registration_status, is_active)
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

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on fund_data
CREATE TRIGGER update_fund_data_updated_at
  BEFORE UPDATE ON public.fund_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- RLS Policies for profiles table
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles"
  ON public.profiles
  FOR ALL
  USING (get_current_user_role() = 'super_admin');

-- RLS Policies for fund_data table
CREATE POLICY "Users can manage their own fund data"
  ON public.fund_data
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all fund data"
  ON public.fund_data
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  ));

-- RLS Policies for trading_history table
CREATE POLICY "Users can manage their own trading history"
  ON public.trading_history
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all trading history"
  ON public.trading_history
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  ));

-- RLS Policies for transaction_history table
CREATE POLICY "Users can view their own transaction history"
  ON public.transaction_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction history"
  ON public.transaction_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all transaction history"
  ON public.transaction_history
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'super_admin'
  ));

-- RLS Policies for admin_notifications table
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