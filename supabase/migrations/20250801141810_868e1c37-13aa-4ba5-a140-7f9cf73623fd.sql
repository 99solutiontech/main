-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  trader_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create fund_data table for trading funds
CREATE TABLE IF NOT EXISTS public.fund_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo',
  initial_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_capital DECIMAL(15,2) NOT NULL DEFAULT 0,
  active_fund DECIMAL(15,2) NOT NULL DEFAULT 0,
  reserve_fund DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit_fund DECIMAL(15,2) NOT NULL DEFAULT 0,
  target_reserve_fund DECIMAL(15,2) NOT NULL DEFAULT 0,
  profit_dist_active INTEGER NOT NULL DEFAULT 50,
  profit_dist_reserve INTEGER NOT NULL DEFAULT 25,
  profit_dist_profit INTEGER NOT NULL DEFAULT 25,
  lot_base_capital DECIMAL(15,2) NOT NULL DEFAULT 1000,
  lot_base_lot DECIMAL(10,2) NOT NULL DEFAULT 0.4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;

-- Create policies for fund_data
CREATE POLICY "Users can view their own fund data" 
ON public.fund_data 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own fund data" 
ON public.fund_data 
FOR ALL 
USING (auth.uid() = user_id);

-- Create trading_history table
CREATE TABLE IF NOT EXISTS public.trading_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  mode TEXT NOT NULL DEFAULT 'demo',
  type TEXT NOT NULL,
  details TEXT,
  end_balance DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;

-- Create policies for trading_history
CREATE POLICY "Users can view their own trading history" 
ON public.trading_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own trading history" 
ON public.trading_history 
FOR ALL 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fund_data_updated_at
  BEFORE UPDATE ON public.fund_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();