// Configuration Template for Trading Fund Management System
// Copy this file and update the values with your self-hosted Supabase instance details

export const INSTALLATION_CONFIG = {
  // Your self-hosted Supabase instance details
  SUPABASE_URL: "https://your-supabase-instance.com", // Replace with your Supabase URL
  SUPABASE_ANON_KEY: "your-anon-key-here", // Replace with your anon key
  PROJECT_ID: "your-project-id", // Replace with your project ID
  
  // Admin configuration
  ADMIN_EMAIL: "admin@yourdomain.com", // First super admin email
  
  // Email configuration (for notifications)
  RESEND_API_KEY: "re_your_resend_api_key", // Your Resend API key
  ADMIN_NOTIFICATION_EMAIL: "admin@yourdomain.com", // Email for admin notifications
  
  // Application settings
  APP_NAME: "Trading Fund Management System",
  APP_DOMAIN: "yourdomain.com", // Your application domain
};

// Files that need to be updated after installation:
export const FILES_TO_UPDATE = [
  {
    file: "src/integrations/supabase/client.ts",
    updates: {
      SUPABASE_URL: INSTALLATION_CONFIG.SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY: INSTALLATION_CONFIG.SUPABASE_ANON_KEY
    }
  },
  {
    file: "supabase/config.toml", 
    updates: {
      project_id: INSTALLATION_CONFIG.PROJECT_ID
    }
  }
];

// Environment variables needed for Edge Functions
export const EDGE_FUNCTION_SECRETS = [
  "RESEND_API_KEY",
  "SUPABASE_URL", 
  "SUPABASE_SERVICE_ROLE_KEY",
  "ADMIN_NOTIFICATION_EMAIL"
];