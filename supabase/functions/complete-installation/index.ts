import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Completing installation...');

    // Get admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify installation by checking if critical tables exist and have proper structure
    const verificationChecks = [
      { table: 'profiles', query: await supabaseAdmin.from('profiles').select('id').limit(1) },
      { table: 'fund_data', query: await supabaseAdmin.from('fund_data').select('id').limit(1) },
      { table: 'trading_history', query: await supabaseAdmin.from('trading_history').select('id').limit(1) },
      { table: 'transaction_history', query: await supabaseAdmin.from('transaction_history').select('id').limit(1) },
      { table: 'admin_notifications', query: await supabaseAdmin.from('admin_notifications').select('id').limit(1) }
    ];

    const failedChecks = [];
    for (const check of verificationChecks) {
      if (check.query.error) {
        failedChecks.push(check.table);
      }
    }

    if (failedChecks.length > 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Installation verification failed. Missing or inaccessible tables: ${failedChecks.join(', ')}. Please ensure you have run the database-setup.sql script.`
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if at least one super admin exists
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .limit(1);

    if (adminError || !adminData || adminData.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No super admin account found. Please ensure you have created a super admin account.'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Ensure app_settings.functions_base_url is set for this host
    const baseUrlToSet = Deno.env.get('SUPABASE_URL') || null;
    if (baseUrlToSet) {
      const { error: settingsError } = await supabaseAdmin
        .from('app_settings')
        .upsert({ key: 'functions_base_url', value: baseUrlToSet });
      if (settingsError) {
        console.warn('Failed to set functions_base_url:', settingsError);
      }
    }

    // Create an installation completion record (optional)
    const { error: logError } = await supabaseAdmin
      .from('admin_notifications')
      .insert({
        type: 'system',
        title: 'Installation Completed',
        message: 'Trading Fund Management System installation completed successfully',
        trader_name: 'System'
      });

    if (logError) {
      console.warn('Failed to log installation completion:', logError);
    }

    console.log('Installation completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Installation completed successfully! Your Trading Fund Management System is ready to use.',
        nextSteps: [
          'Login with your admin account',
          'Configure user registration settings',
          'Set up initial trading funds',
          'Review security settings'
        ]
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during installation completion:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `Unexpected error: ${error.message}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);