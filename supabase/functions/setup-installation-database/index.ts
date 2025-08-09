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
    const { projectId } = await req.json();

    console.log('Setting up database for project:', projectId);

    // Get admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify Supabase admin access without running SQL
    const { data: users, error: adminError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });

    if (adminError) {
      console.error('Database setup verification failed:', adminError);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Cannot verify database access: ${adminError.message}. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables in your Edge Functions settings.`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return success and guidance to apply SQL schema manually (self-hosted install)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Database connection verified. Apply schema using installation/database-setup.sql in your Supabase SQL editor.',
        self_hosted: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error during database setup:', error);
    
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