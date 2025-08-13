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
    const { supabaseUrl, supabaseAnonKey, projectId } = await req.json();

    console.log('Testing connection for project:', projectId);

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

    // Test connection with provided credentials
    const testClient = createClient(supabaseUrl, supabaseAnonKey);

    // Perform basic connectivity tests
    const tests = [
      {
        name: 'Basic Connection',
        test: async () => {
          const { data, error } = await testClient.from('profiles').select('count').limit(1);
          return { success: !error, details: error?.message || 'Connected successfully' };
        }
      },
      {
        name: 'Authentication Service',
        test: async () => {
          const { data, error } = await testClient.auth.getSession();
          return { success: !error, details: error?.message || 'Auth service accessible' };
        }
      },
      {
        name: 'Storage Service',
        test: async () => {
          const { data, error } = await testClient.storage.listBuckets();
          return { success: !error, details: error?.message || 'Storage service accessible' };
        }
      }
    ];

    const testResults = [];
    let allTestsPassed = true;

    for (const test of tests) {
      try {
        const result = await test.test();
        testResults.push({
          name: test.name,
          passed: result.success,
          details: result.details
        });
        if (!result.success) {
          allTestsPassed = false;
        }
      } catch (error) {
        testResults.push({
          name: test.name,
          passed: false,
          details: error.message
        });
        allTestsPassed = false;
      }
    }

    // Additional environment check
    const environmentInfo = {
      supabaseUrl: supabaseUrl,
      projectId: projectId,
      timestamp: new Date().toISOString(),
      version: '2.0'
    };

    console.log('Connection test completed:', { allTestsPassed, testResults });

    return new Response(
      JSON.stringify({ 
        success: allTestsPassed, 
        message: allTestsPassed ? 'All connection tests passed successfully' : 'Some tests failed',
        tests: testResults,
        environment: environmentInfo,
        recommendations: allTestsPassed ? [
          'Connection is working properly',
          'Ready to proceed with database setup'
        ] : [
          'Check your Supabase URL and keys',
          'Ensure your Supabase instance is running',
          'Verify network connectivity'
        ]
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
        error: `Unexpected error: ${error.message}`,
        recommendations: [
          'Verify your Supabase instance is accessible',
          'Check your network connection',
          'Ensure your credentials are correct'
        ]
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

serve(handler);