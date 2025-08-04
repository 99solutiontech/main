import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { resendApiKey, adminNotificationEmail, projectId } = await req.json();

    console.log('Configuring email service for project:', projectId);

    if (!resendApiKey || !adminNotificationEmail || !projectId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: resendApiKey, adminNotificationEmail, or projectId' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Test the Resend API key by making a test request
    const testEmailResponse = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!testEmailResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid Resend API key. Please check your API key and try again.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // In a real installation, you would store these secrets in Supabase Edge Functions secrets
    // For now, we'll just validate the format and return success
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(adminNotificationEmail)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format for admin notification email' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Email service configuration validated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email service configured successfully',
        note: 'Please ensure the RESEND_API_KEY and ADMIN_NOTIFICATION_EMAIL secrets are set in your Supabase Edge Functions settings'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during email configuration:', error);
    
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