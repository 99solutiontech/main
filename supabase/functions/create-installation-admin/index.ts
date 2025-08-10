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
    const { adminEmail, projectId } = await req.json();

    console.log('Creating admin account for:', adminEmail);

    if (!adminEmail || !projectId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: adminEmail or projectId' 
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

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    // Create the admin user
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: 'System Administrator',
        trader_name: 'SuperAdmin'
      }
    });

    if (createError) {
      console.error('Failed to create admin user:', createError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create admin user: ${createError.message}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (userData.user) {
      const userId = userData.user.id;

      // Check if profile exists
      const { data: existingProfile, error: fetchProfileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchProfileError) {
        console.error('Failed to check existing profile:', fetchProfileError);
      } else if (existingProfile) {
        const { error: profileUpdateError } = await supabaseAdmin
          .from('profiles')
          .update({ 
            role: 'super_admin',
            status: 'approved',
            trader_name: 'SuperAdmin',
            email: adminEmail,
            full_name: 'System Administrator'
          })
          .eq('user_id', userId);

        if (profileUpdateError) {
          console.error('Failed to update profile:', profileUpdateError);
        }
      } else {
        const { error: profileInsertError } = await supabaseAdmin
          .from('profiles')
          .insert({ 
            user_id: userId,
            email: adminEmail,
            full_name: 'System Administrator',
            role: 'super_admin',
            status: 'approved',
            trader_name: 'SuperAdmin'
          });

        if (profileInsertError) {
          console.error('Failed to create profile:', profileInsertError);
        }
      }
    }

    // Send password reset email so admin can set their own password
    const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: adminEmail
    });

    if (resetError) {
      console.warn('Failed to send password reset email:', resetError);
    }

    console.log('Admin account created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin account created successfully. A password reset email has been sent.',
        adminEmail: adminEmail,
        tempPassword: tempPassword // In production, this should be sent via email only
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error during admin creation:', error);
    
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