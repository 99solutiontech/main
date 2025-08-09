import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, serviceRoleKey, adminEmail, adminPassword } = await req.json();

    console.log('Configuring self-hosted Supabase:', supabaseUrl);

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Step 1: Enable required extensions
    console.log('Enabling extensions...');
    const { error: extensionError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      `
    });

    if (extensionError) {
      console.error('Extension error:', extensionError);
    }

    // Step 2: Create tables
    console.log('Creating tables...');
    const { error: tableError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Create profiles table
        CREATE TABLE IF NOT EXISTS public.profiles (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid NOT NULL UNIQUE,
          full_name text,
          trader_name text NOT NULL,
          registration_status text DEFAULT 'approved',
          is_active boolean DEFAULT true,
          role text DEFAULT 'user',
          created_at timestamp with time zone NOT NULL DEFAULT now(),
          updated_at timestamp with time zone NOT NULL DEFAULT now()
        );

        -- Create fund_data table
        CREATE TABLE IF NOT EXISTS public.fund_data (
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

        -- Create trading_history table
        CREATE TABLE IF NOT EXISTS public.trading_history (
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

        -- Create transaction_history table
        CREATE TABLE IF NOT EXISTS public.transaction_history (
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

        -- Create admin_notifications table
        CREATE TABLE IF NOT EXISTS public.admin_notifications (
          id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id uuid,
          type text NOT NULL,
          title text NOT NULL,
          message text NOT NULL,
          trader_name text,
          is_read boolean NOT NULL DEFAULT false,
          created_at timestamp with time zone NOT NULL DEFAULT now()
        );
      `
    });

    if (tableError) {
      console.error('Table creation error:', tableError);
    }

    // Step 3: Create admin user
    console.log('Creating admin user...');
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Admin',
        trader_name: 'admin'
      }
    });

    if (userError) {
      console.error('User creation error:', userError);
      throw userError;
    }

    console.log('Admin user created:', userData.user?.id);

    // Step 4: Insert admin profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: userData.user.id,
        full_name: 'Super Admin',
        trader_name: 'admin',
        registration_status: 'approved',
        is_active: true,
        role: 'super_admin'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
    }

    // Step 5: Insert initial fund data
    const { error: fundError } = await supabaseAdmin
      .from('fund_data')
      .upsert({
        user_id: userData.user.id,
        mode: 'diamond',
        initial_capital: 10000.00,
        total_capital: 10000.00,
        active_fund: 10000.00,
        reserve_fund: 0,
        profit_fund: 0,
        target_reserve_fund: 0
      });

    if (fundError) {
      console.error('Fund data creation error:', fundError);
    }

    // Step 6: Enable RLS and create policies
    console.log('Setting up RLS policies...');
    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', {
      sql: `
        -- Enable RLS on all tables
        ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.fund_data ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.trading_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.transaction_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

        -- Create utility functions
        CREATE OR REPLACE FUNCTION public.get_current_user_role()
        RETURNS text
        LANGUAGE sql
        STABLE SECURITY DEFINER
        SET search_path TO ''
        AS $$
          SELECT role FROM public.profiles WHERE user_id = auth.uid();
        $$;

        CREATE OR REPLACE FUNCTION public.update_updated_at_column()
        RETURNS trigger
        LANGUAGE plpgsql
        SET search_path TO ''
        AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$;

        -- Create triggers for updated_at
        DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
        CREATE TRIGGER update_profiles_updated_at
        BEFORE UPDATE ON public.profiles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

        DROP TRIGGER IF EXISTS update_fund_data_updated_at ON public.fund_data;
        CREATE TRIGGER update_fund_data_updated_at
        BEFORE UPDATE ON public.fund_data
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();

        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
        DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;

        -- Create profiles policies
        CREATE POLICY "Users can view their own profile" 
        ON public.profiles FOR SELECT 
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can update their own profile" 
        ON public.profiles FOR UPDATE 
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own profile" 
        ON public.profiles FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Super admins can view all profiles" 
        ON public.profiles FOR ALL 
        USING (get_current_user_role() = 'super_admin');

        -- Fund data policies
        DROP POLICY IF EXISTS "Users can manage their own fund data" ON public.fund_data;
        DROP POLICY IF EXISTS "Super admins can view all fund data" ON public.fund_data;

        CREATE POLICY "Users can manage their own fund data" 
        ON public.fund_data FOR ALL 
        USING (auth.uid() = user_id);

        CREATE POLICY "Super admins can view all fund data" 
        ON public.fund_data FOR SELECT 
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'));

        -- Trading history policies
        DROP POLICY IF EXISTS "Users can manage their own trading history" ON public.trading_history;
        DROP POLICY IF EXISTS "Super admins can view all trading history" ON public.trading_history;

        CREATE POLICY "Users can manage their own trading history" 
        ON public.trading_history FOR ALL 
        USING (auth.uid() = user_id);

        CREATE POLICY "Super admins can view all trading history" 
        ON public.trading_history FOR SELECT 
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'));

        -- Transaction history policies
        DROP POLICY IF EXISTS "Users can view their own transaction history" ON public.transaction_history;
        DROP POLICY IF EXISTS "Users can insert their own transaction history" ON public.transaction_history;
        DROP POLICY IF EXISTS "Super admins can view all transaction history" ON public.transaction_history;

        CREATE POLICY "Users can view their own transaction history" 
        ON public.transaction_history FOR SELECT 
        USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own transaction history" 
        ON public.transaction_history FOR INSERT 
        WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Super admins can view all transaction history" 
        ON public.transaction_history FOR SELECT 
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'));

        -- Admin notifications policies
        DROP POLICY IF EXISTS "Super admins can view all notifications" ON public.admin_notifications;
        DROP POLICY IF EXISTS "System can insert notifications" ON public.admin_notifications;

        CREATE POLICY "Super admins can view all notifications" 
        ON public.admin_notifications FOR SELECT 
        USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'super_admin'));

        CREATE POLICY "System can insert notifications" 
        ON public.admin_notifications FOR INSERT 
        WITH CHECK (true);
      `
    });

    if (rlsError) {
      console.error('RLS setup error:', rlsError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Self-hosted Supabase configured successfully',
      adminUserId: userData.user.id,
      adminEmail: adminEmail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Configuration error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});