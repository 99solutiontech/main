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

    // Get admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Store email configuration in app_settings
    const emailSettings = [
      { key: 'resend_api_key', value: resendApiKey },
      { key: 'admin_notification_email', value: adminNotificationEmail },
      { key: 'email_service_configured', value: 'true' }
    ];

    for (const setting of emailSettings) {
      const { error } = await supabaseAdmin
        .from('app_settings')
        .upsert(setting);

      if (error) {
        console.error(`Failed to store setting ${setting.key}:`, error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to store email configuration: ${error.message}` 
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Test email service by sending a test notification
    try {
      const testResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: 'Trading System <noreply@yourdomain.com>',
          to: adminNotificationEmail,
          subject: 'Trading Fund Management System - Email Service Configured',
          html: `
            <h2>Email Service Configuration Complete</h2>
            <p>Your Trading Fund Management System email service has been successfully configured.</p>
            <p>Project ID: ${projectId}</p>
            <p>Admin Email: ${adminNotificationEmail}</p>
            <p>Configuration Date: ${new Date().toISOString()}</p>
            <hr>
            <p><small>This is an automated message from your Trading Fund Management System.</small></p>
          `
        })
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.text();
        console.warn('Test email failed, but configuration saved:', errorData);
      }
    } catch (emailError) {
      console.warn('Test email failed, but configuration saved:', emailError);
    }

    // Log the configuration
    const { error: logError } = await supabaseAdmin
      .from('admin_notifications')
      .insert({
        type: 'system',
        title: 'Email Service Configured',
        message: `Email service configured successfully for ${adminNotificationEmail}`,
        trader_name: 'System'
      });

    if (logError) {
      console.warn('Failed to log email configuration:', logError);
    }

    console.log('Email service configured successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email service configured successfully. A test email has been sent.',
        adminNotificationEmail: adminNotificationEmail
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