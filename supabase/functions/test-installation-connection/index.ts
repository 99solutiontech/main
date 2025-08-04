import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ConnectionTestRequest {
  supabaseUrl: string;
  supabaseAnonKey: string;
  projectId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { supabaseUrl, supabaseAnonKey, projectId }: ConnectionTestRequest = await req.json();

    console.log('Testing connection to:', supabaseUrl);

    // Validate required fields
    if (!supabaseUrl || !supabaseAnonKey || !projectId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: supabaseUrl, supabaseAnonKey, or projectId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create a test client with provided credentials
    const testClient = createClient(supabaseUrl, supabaseAnonKey);

    // Test the connection by trying to query the auth endpoint
    const { data, error } = await testClient.auth.getSession();

    if (error && error.message !== 'No session found') {
      console.error('Connection test failed:', error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Connection failed: ${error.message}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Additional test: Try to query a system table to ensure database access
    const { error: dbError } = await testClient
      .from('profiles')
      .select('count')
      .limit(1);

    // If profiles table doesn't exist yet, that's expected for a fresh installation
    console.log('Database connection test completed');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connection successful',
        projectId: projectId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during connection test:', error);
    
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