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
    const { projectId, supabaseUrl, dbName, dbUser, dbPassword } = await req.json();

    console.log('Setting up database for project:', projectId);
    console.log('Database configuration:', { dbName, dbUser, supabaseUrl });

    // Validate required fields
    if (!projectId || !supabaseUrl) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: projectId and supabaseUrl are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if this is a fresh installation by testing table existence
    let isExistingInstallation = false;
    
    try {
      // Test if profiles table exists and has data
      const { data: profilesTest, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (!profilesError && profilesTest) {
        isExistingInstallation = true;
        console.log('Existing installation detected');
      }
    } catch (err) {
      console.log('Fresh installation detected - tables do not exist yet');
    }

    if (isExistingInstallation) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Database tables already exist. Your installation appears to be ready.',
          isExisting: true
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // For fresh installations, provide clear setup instructions
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database connection verified. Now you need to set up the database schema.',
        isExisting: false,
        nextSteps: [
          'Go to your Supabase Dashboard SQL Editor',
          'Copy and run the database-setup-complete.sql file',
          'This will create all necessary tables, functions, and security policies',
          'After running the SQL script, continue with the next installation step'
        ],
        sqlFile: 'database-setup-complete.sql',
        dashboardUrl: `${supabaseUrl}/project/${projectId}/sql/new`
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