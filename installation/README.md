# Trading Fund Management System - Installation Guide

Welcome to the Trading Fund Management System! This guide will help you install the complete system on your self-hosted Supabase instance.

## 📋 Prerequisites

- Self-hosted Supabase instance running
- Supabase CLI installed (`npm install -g supabase`)
- Database access (PostgreSQL)
- Resend API account (for email notifications)
- Node.js installed

## 🚀 Quick Installation

### Step 1: Database Setup

1. Connect to your Supabase database
2. Run the main installation script:
   ```sql
   -- Execute the contents of database-setup.sql
   ```
   This will create all tables, functions, policies, and triggers.

### Step 2: Configure Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and add these secrets:
- `RESEND_API_KEY`: Your Resend API key for email notifications
- `SUPABASE_URL`: Your Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
- `ADMIN_NOTIFICATION_EMAIL`: Email address for admin notifications

### Step 3: Deploy Edge Functions

```bash
# Make the script executable
chmod +x edge-functions-deploy.sh

# Run the deployment script
./edge-functions-deploy.sh
```

### Step 4: Update Application Configuration

Option A - Automatic (Recommended):
```bash
node update-app-config.js
```

Option B - Manual:
1. Edit `src/integrations/supabase/client.ts`:
   - Update `SUPABASE_URL`
   - Update `SUPABASE_PUBLISHABLE_KEY`

2. Edit `supabase/config.toml`:
   - Update `project_id`

### Step 5: Create Super Admin User

1. First, create a user through your Supabase Auth interface
2. Note the user's email address
3. Edit `create-super-admin.sql` and update the email
4. Run the script to promote the user to super admin

### Step 6: Verify Installation

1. Start the application: `npm run dev`
2. Test user registration and login
3. Test admin dashboard features
4. Verify email notifications work
5. Check real-time updates

## 🔧 System Components

### Database Tables
- **profiles**: User profile information and roles
- **fund_data**: Trading fund management data
- **trading_history**: Trading transaction records
- **transaction_history**: Fund transfer records
- **admin_notifications**: System notifications

### Edge Functions
- **security-monitor**: Handles security events and alerts
- **send-admin-notification**: Sends email notifications
- **approve-user**: Admin function to approve user registrations
- **delete-user**: Admin function to delete users

### Key Features
- Role-based access control (super_admin, user)
- Real-time updates for trading data
- Email notification system
- Secure fund management with audit trails
- Multi-user support with sub-user functionality

## 🛠️ Troubleshooting

### Common Issues

**Database Connection Failed**
- Verify your Supabase URL and keys are correct
- Check if your Supabase instance is running
- Ensure network connectivity

**Edge Functions Not Working**
- Check if environment variables are set correctly
- Verify Supabase CLI is logged in
- Check function logs in Supabase dashboard

**Email Notifications Not Sent**
- Verify RESEND_API_KEY is set correctly
- Check if the Resend domain is verified
- Review function logs for error messages

**Authentication Issues**
- Ensure RLS policies are applied correctly
- Check if the user profile was created properly
- Verify the super admin user was created

### Support

If you encounter issues:
1. Check the console logs in your browser
2. Review Edge Function logs in Supabase dashboard
3. Verify all configuration values are correct
4. Ensure all required environment variables are set

## 🔄 Updates and Maintenance

### Updating the System
1. Backup your database before any updates
2. Review changelog for breaking changes
3. Update application code
4. Run any new database migrations
5. Redeploy Edge Functions if changed

### Backup Strategy
- Regular database backups (recommended: daily)
- Store configuration files securely
- Document any custom modifications

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Database Management](https://supabase.com/docs/guides/database)

---

**Installation Complete!** 🎉

Your Trading Fund Management System is now ready to use. Login with your super admin account to start managing users and trading funds.