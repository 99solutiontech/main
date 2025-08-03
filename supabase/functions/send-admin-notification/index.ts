import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: 'registration' | 'security' | 'system';
  title: string;
  message: string;
  user_id?: string;
  trader_name?: string;
  admin_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, title, message, user_id, trader_name, admin_email }: NotificationRequest = await req.json();

    // Get admin email from environment or use provided one
    const adminEmail = admin_email || Deno.env.get("ADMIN_EMAIL") || "admin@yourdomain.com";

    // Determine email content based on notification type
    let emailSubject = "";
    let emailContent = "";

    switch (type) {
      case 'registration':
        emailSubject = `New User Registration: ${trader_name || 'Unknown User'}`;
        emailContent = `
          <h1>New User Registration</h1>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Trader Name:</strong> ${trader_name || 'Not provided'}</p>
          <p><strong>User ID:</strong> ${user_id || 'Not provided'}</p>
          <p>Please review and approve/reject this registration in the admin panel.</p>
          <hr>
          <p><small>MoneyX Admin System</small></p>
        `;
        break;
      
      case 'security':
        emailSubject = `🚨 Security Alert: ${title}`;
        emailContent = `
          <h1 style="color: #dc2626;">🚨 Security Alert</h1>
          <p><strong>Alert:</strong> ${title}</p>
          <p><strong>Details:</strong> ${message}</p>
          <p><strong>User ID:</strong> ${user_id || 'System-wide'}</p>
          <p><strong>Trader Name:</strong> ${trader_name || 'N/A'}</p>
          <p>Please review this security incident immediately in the admin panel.</p>
          <hr>
          <p><small>MoneyX Security System</small></p>
        `;
        break;
      
      case 'system':
        emailSubject = `System Notification: ${title}`;
        emailContent = `
          <h1>System Notification</h1>
          <p><strong>Title:</strong> ${title}</p>
          <p><strong>Message:</strong> ${message}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <hr>
          <p><small>MoneyX System</small></p>
        `;
        break;
    }

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "MoneyX Admin <onboarding@resend.dev>", // Change this to your verified domain
      to: [adminEmail],
      subject: emailSubject,
      html: emailContent,
    });

    console.log("Admin notification email sent:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      email_sent: true,
      email_id: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-admin-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        email_sent: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);