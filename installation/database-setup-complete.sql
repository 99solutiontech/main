-- Trading Fund Management System - Complete Database Installation Script
-- This script sets up the complete database schema including tables, functions, policies, and triggers
-- Compatible with self-hosted Supabase instances

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create app_settings table for system configuration
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    full_name TEXT,
    trader_name TEXT,
    first_name TEXT,
    last_name TEXT,
    address TEXT,
    email TEXT,
    phone_number TEXT,
    currency_unit TEXT DEFAULT 'USD',
    language TEXT DEFAULT 'en',
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fund_data table with updated defaults
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
    profit_dist_active NUMERIC DEFAULT 0,
    profit_dist_reserve NUMERIC DEFAULT 30,
    profit_dist_profit NUMERIC DEFAULT 70,
    lot_base_capital NUMERIC DEFAULT 1000,
    lot_base_lot NUMERIC DEFAULT 0.01,
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
    symbol TEXT,
    lot_size NUMERIC,
    entry_price NUMERIC,
    exit_price NUMERIC,
    profit_loss NUMERIC,
    start_balance NUMERIC,
    end_balance NUMERIC,
    details TEXT,
    notes TEXT,
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
    description TEXT,
    balance_before NUMERIC,
    balance_after NUMERIC,
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
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    mode TEXT NOT NULL,
    sub_user_name TEXT,
    lot_size_settings JSONB DEFAULT '{}',
    profit_management_settings JSONB DEFAULT '{}',
    deposit_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create economic_events table
CREATE TABLE IF NOT EXISTS public.economic_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    currency TEXT NOT NULL,
    impact_level TEXT NOT NULL,
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    forecast TEXT,
    previous TEXT,
    actual TEXT,
    detail_url TEXT,
    source TEXT NOT NULL DEFAULT 'forexfactory',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;

-- Create database functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE user_id = auth.uid()
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, role, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'user',
        'pending'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to set default user settings
CREATE OR REPLACE FUNCTION public.set_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lot_size_settings IS NULL THEN
        NEW.lot_size_settings = jsonb_build_object('risk_percent', 40);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_fund_data_updated_at
    BEFORE UPDATE ON public.fund_data
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_admin_notifications_updated_at
    BEFORE UPDATE ON public.admin_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_economic_events_updated_at
    BEFORE UPDATE ON public.economic_events
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE TRIGGER set_default_user_settings_trigger
    BEFORE INSERT ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_default_user_settings();

-- Create RLS policies for app_settings
CREATE POLICY "Admins can manage app settings" ON public.app_settings
    FOR ALL USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']))
    WITH CHECK (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']))
    WITH CHECK (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- Create RLS policies for fund_data
CREATE POLICY "Users can manage their own fund data" ON public.fund_data
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all fund data" ON public.fund_data
    FOR SELECT USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- Create RLS policies for trading_history
CREATE POLICY "Users can manage their own trading history" ON public.trading_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all trading history" ON public.trading_history
    FOR SELECT USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- Create RLS policies for transaction_history
CREATE POLICY "Users can manage their own transaction history" ON public.transaction_history
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all transaction history" ON public.transaction_history
    FOR SELECT USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

-- Create RLS policies for admin_notifications
CREATE POLICY "Admins can view all notifications" ON public.admin_notifications
    FOR SELECT USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

CREATE POLICY "Admins can update notifications" ON public.admin_notifications
    FOR UPDATE USING (get_current_user_role() = ANY (ARRAY['admin', 'super_admin']));

CREATE POLICY "System can insert notifications" ON public.admin_notifications
    FOR INSERT WITH CHECK (true);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for economic_events
CREATE POLICY "Allow authenticated users to view economic events" ON public.economic_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('99solutiontech', '99solutiontech', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Public bucket access" ON storage.objects
    FOR ALL USING (bucket_id = '99solutiontech');

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

-- Insert default app settings
INSERT INTO public.app_settings (key, value) VALUES 
    ('system_initialized', 'true'),
    ('installation_date', NOW()::text),
    ('default_currency', 'USD'),
    ('default_language', 'en')
ON CONFLICT (key) DO NOTHING;

-- Installation completed successfully
DO $$
BEGIN
    RAISE NOTICE 'Trading Fund Management System database installation completed successfully!';
    RAISE NOTICE 'Database schema version: 2.0';
    RAISE NOTICE 'All tables, functions, triggers, and policies have been created.';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Deploy Edge Functions using the provided scripts';
    RAISE NOTICE '2. Configure environment variables for Edge Functions';
    RAISE NOTICE '3. Create your first super admin user';
    RAISE NOTICE '4. Update application configuration files';
END $$;