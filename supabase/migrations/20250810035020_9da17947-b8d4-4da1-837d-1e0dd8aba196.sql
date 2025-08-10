-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fund_data table
CREATE TABLE public.fund_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('diamond', 'gold')),
  sub_user_name TEXT,
  initial_capital DECIMAL(15,2) DEFAULT 0,
  total_capital DECIMAL(15,2) DEFAULT 0,
  active_fund DECIMAL(15,2) DEFAULT 0,
  reserve_fund DECIMAL(15,2) DEFAULT 0,
  profit_fund DECIMAL(15,2) DEFAULT 0,
  target_reserve_fund DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading_history table
CREATE TABLE public.trading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('diamond', 'gold')),
  sub_user_name TEXT,
  type TEXT NOT NULL CHECK (type IN ('buy', 'sell', 'profit', 'loss')),
  symbol TEXT,
  lot_size DECIMAL(10,4),
  entry_price DECIMAL(15,5),
  exit_price DECIMAL(15,5),
  profit_loss DECIMAL(15,2),
  start_balance DECIMAL(15,2),
  end_balance DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_history table
CREATE TABLE public.transaction_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('diamond', 'gold')),
  sub_user_name TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdraw', 'transfer', 'transfer_in', 'transfer_out')),
  from_fund TEXT,
  to_fund TEXT,
  amount DECIMAL(15,2) NOT NULL,
  balance_before DECIMAL(15,2),
  balance_after DECIMAL(15,2),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('diamond', 'gold')),
  sub_user_name TEXT,
  lot_size_settings JSONB DEFAULT '{}',
  deposit_settings JSONB DEFAULT '{}',
  profit_management_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for fund_data
CREATE POLICY "Users can manage their own fund data" ON public.fund_data
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fund data" ON public.fund_data
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for trading_history
CREATE POLICY "Users can manage their own trading history" ON public.trading_history
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trading history" ON public.trading_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for transaction_history
CREATE POLICY "Users can manage their own transaction history" ON public.transaction_history
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transaction history" ON public.transaction_history
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
FOR ALL USING (auth.uid() = user_id);

-- Create update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fund_data_updated_at
  BEFORE UPDATE ON public.fund_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_fund_data_user_mode ON public.fund_data(user_id, mode);
CREATE INDEX idx_fund_data_sub_user ON public.fund_data(user_id, mode, sub_user_name);
CREATE INDEX idx_trading_history_user_mode ON public.trading_history(user_id, mode);
CREATE INDEX idx_trading_history_sub_user ON public.trading_history(user_id, mode, sub_user_name);
CREATE INDEX idx_transaction_history_user_mode ON public.transaction_history(user_id, mode);
CREATE INDEX idx_transaction_history_sub_user ON public.transaction_history(user_id, mode, sub_user_name);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_status ON public.profiles(status);