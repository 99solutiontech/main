import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SecurityEvent {
  type: 'failed_login' | 'suspicious_activity' | 'multiple_sessions' | 'data_breach_attempt';
  user_id?: string;
  ip_address?: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, user_id, ip_address, details, severity }: SecurityEvent = await req.json();

    // Get user info if user_id is provided
    let trader_name = 'Unknown User';
    if (user_id) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('trader_name')
        .eq('user_id', user_id)
        .single();
      
      trader_name = userProfile?.trader_name || 'Unknown User';
    }

    // Create notification title and message based on event type
    let title = "";
    let message = "";

    switch (type) {
      case 'failed_login':
        title = `Failed Login Attempt`;
        message = `Multiple failed login attempts detected for user ${trader_name} from IP: ${ip_address}. ${details}`;
        break;
      
      case 'suspicious_activity':
        title = `Suspicious Activity Detected`;
        message = `Unusual activity detected for user ${trader_name}. ${details}`;
        break;
      
      case 'multiple_sessions':
        title = `Multiple Sessions Warning`;
        message = `User ${trader_name} has multiple active sessions from different locations. ${details}`;
        break;
      
      case 'data_breach_attempt':
        title = `Data Breach Attempt`;
        message = `Potential data breach attempt detected. User: ${trader_name}, IP: ${ip_address}. ${details}`;
        break;
    }

    // Create admin notification in database (will work after migration)
    try {
      await supabase
        .from('admin_notifications')
        .insert({
          type: 'security',
          title,
          message,
          user_id,
          is_read: false,
        });
    } catch (dbError) {
      console.log('Database notification not available yet');
    }

    // Send email notification to admin
    const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'security',
        title,
        message,
        user_id,
        trader_name,
      }),
    });

    console.log("Security alert processed:", { type, severity, user_id });

    return new Response(JSON.stringify({ 
      success: true,
      alert_created: true,
      severity,
      type
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in security-monitor function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);