-- Trading Fund Management System - Database Installation Script
-- This script sets up the complete database schema including tables, functions, policies, and triggers

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    trader_name TEXT NOT NULL,
    registration_status TEXT DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fund_data table
CREATE TABLE IF NOT EXISTS public.fund_data (
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
    profit_dist_active INTEGER DEFAULT 50,
    profit_dist_reserve INTEGER DEFAULT 25,
    profit_dist_profit INTEGER DEFAULT 25,
    lot_base_capital NUMERIC DEFAULT 1000,
    lot_base_lot NUMERIC DEFAULT 0.40,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trading_history table
CREATE TABLE IF NOT EXISTS public.trading_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    mode TEXT NOT NULL,
    sub_user_name TEXT,
    type TEXT NOT NULL,
    amount NUMERIC,
    details TEXT NOT NULL,
    end_balance NUMERIC NOT NULL,
    trade_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_history table
CREATE TABLE IF NOT EXISTS public.transaction_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    mode TEXT NOT NULL,
    sub_user_name TEXT,
    transaction_type TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    from_fund TEXT,
    to_fund TEXT,
    description TEXT NOT NULL,
    balance_before NUMERIC NOT NULL,
    balance_after NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin_notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    trader_name TEXT,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Create database functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
    SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

CREATE OR REPLACE FUNCTION public.get_profiles_by_email(email_param text)
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
    FROM public.profiles p
    INNER JOIN auth.users u ON p.user_id = u.id
    WHERE u.email = email_param;
END;
$$;

-- Create triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fund_data_updated_at
    BEFORE UPDATE ON public.fund_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all profiles" ON public.profiles
    FOR ALL USING (get_current_user_role() = 'super_admin');

-- Create RLS policies for fund_data
DROP POLICY IF EXISTS "Users can manage their own fund data" ON public.fund_data;
DROP POLICY IF EXISTS "Super admins can view all fund data" ON public.fund_data;

CREATE POLICY "Users can manage their own fund data" ON public.fund_data
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all fund data" ON public.fund_data
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
    ));

-- Create RLS policies for trading_history
DROP POLICY IF EXISTS "Users can manage their own trading history" ON public.trading_history;
DROP POLICY IF EXISTS "Super admins can view all trading history" ON public.trading_history;

CREATE POLICY "Users can manage their own trading history" ON public.trading_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all trading history" ON public.trading_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
    ));

-- Create RLS policies for transaction_history
DROP POLICY IF EXISTS "Users can view their own transaction history" ON public.transaction_history;
DROP POLICY IF EXISTS "Users can insert their own transaction history" ON public.transaction_history;
DROP POLICY IF EXISTS "Super admins can view all transaction history" ON public.transaction_history;

CREATE POLICY "Users can view their own transaction history" ON public.transaction_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction history" ON public.transaction_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all transaction history" ON public.transaction_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
    ));

-- Create RLS policies for admin_notifications
DROP POLICY IF EXISTS "Super admins can view all notifications" ON public.admin_notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;

CREATE POLICY "Super admins can view all notifications" ON public.admin_notifications
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'
    ));

CREATE POLICY "System can insert notifications" ON public.admin_notifications
    FOR INSERT WITH CHECK (true);

-- Enable real-time for relevant tables
ALTER TABLE public.fund_data REPLICA IDENTITY FULL;
ALTER TABLE public.trading_history REPLICA IDENTITY FULL;
ALTER TABLE public.transaction_history REPLICA IDENTITY FULL;
ALTER TABLE public.admin_notifications REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.fund_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.trading_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transaction_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('99solutiontech', '99solutiontech', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
DROP POLICY IF EXISTS "Public bucket access" ON storage.objects;
CREATE POLICY "Public bucket access" ON storage.objects
    FOR ALL USING (bucket_id = '99solutiontech');

-- Installation completed successfully
DO $$
BEGIN
    RAISE NOTICE 'Trading Fund Management System database installation completed successfully!';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy Edge Functions using the provided scripts';
    RAISE NOTICE '2. Configure environment variables for Edge Functions';
    RAISE NOTICE '3. Create your first super admin user';
    RAISE NOTICE '4. Update application configuration files';
END $$;