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
    console.log('Starting database reset process...')

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

    const { adminEmail, adminPassword } = await req.json()
    
    if (!adminEmail || !adminPassword) {
      return new Response(
        JSON.stringify({ error: 'Admin email and password are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('Deleting all existing data...')

    // Delete all data from tables (in correct order due to foreign keys)
    await supabaseAdmin.from('admin_notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('transaction_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('trading_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('fund_data').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Delete all users from auth.users
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    if (users?.users && users.users.length > 0) {
      for (const user of users.users) {
        await supabaseAdmin.auth.admin.deleteUser(user.id)
      }
    }

    console.log('Creating new super admin user...')

    // Create new super admin user
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
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

    // Create profile for the admin user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
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

    // Create initial fund data
    const { error: fundError } = await supabaseAdmin
      .from('fund_data')
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

    console.log('Database reset completed successfully!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Database reset successfully. Fresh super admin user created.',
        adminEmail: adminEmail
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Database reset error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})