export const configureSelfHostedSupabase = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  adminEmail: string,
  adminPassword: string
) => {
  try {
    const response = await fetch(`${window.location.origin}/supabase/functions/v1/configure-self-hosted`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        supabaseUrl,
        serviceRoleKey,
        adminEmail,
        adminPassword
      })
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Configuration failed');
    }

    return result;
  } catch (error) {
    console.error('Configuration error:', error);
    throw error;
  }
};