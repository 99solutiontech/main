import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Creating super admin user...')

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SELF_HOSTED_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Create new super admin user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: 'ceoserd@gmail.com',
      password: 'Mis@478992',
      email_confirm: true,
      user_metadata: {
        full_name: 'Super Administrator',
        trader_name: 'SuperAdmin'
      }
    })

    if (createUserError) {
      console.error('Error creating user:', createUserError)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin user', details: createUserError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating admin profile...')

    // Create profile for the admin user in new table
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: newUser.user.id,
        full_name: 'Super Administrator',
        trader_name: 'SuperAdmin',
        role: 'super_admin',
        registration_status: 'approved',
        is_active: true
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      return new Response(
        JSON.stringify({ error: 'Failed to create admin profile', details: profileError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Creating initial fund data...')

    // Create initial fund data in new table
    const { error: fundError } = await supabaseAdmin
      .from('trading_funds')
      .insert({
        user_id: newUser.user.id,
        mode: 'diamond',
        sub_user_name: null,
        initial_capital: 10000,
        total_capital: 10000,
        active_fund: 10000,
        reserve_fund: 0,
        profit_fund: 0,
        target_reserve_fund: 5000,
        risk_percent: 40,
        lot_base_capital: 1000,
        lot_base_lot: 0.40,
        profit_dist_profit: 25,
        profit_dist_reserve: 25,
        profit_dist_active: 50
      })

    if (fundError) {
      console.error('Error creating fund data:', fundError)
      return new Response(
        JSON.stringify({ error: 'Failed to create initial fund data', details: fundError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Super admin created successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Super admin user created successfully with fresh tables.',
        adminEmail: 'ceoserd@gmail.com'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Setup error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})