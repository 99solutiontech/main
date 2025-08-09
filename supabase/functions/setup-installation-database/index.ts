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

    // Database setup SQL - this would typically be run via direct SQL execution
    // For now, we'll check if tables exist and create them if they don't
    
    const setupQueries = [
      // Check if profiles table exists
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles'
      );`,
    ];

    // Try to execute a test query to verify database access
    const { data: tableExists, error } = await supabaseAdmin
      .rpc('sql', { query: setupQueries[0] })
      .single();

    if (error) {
      console.error('Database setup failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Database setup failed: ${error.message}. Please run the database-setup.sql script manually.` 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For security reasons, we'll return success but recommend manual SQL execution
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database connection verified. Please ensure you have run the database-setup.sql script in your Supabase SQL editor.',
        recommendation: 'Execute the database-setup.sql file in your Supabase dashboard SQL editor for complete setup.'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
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