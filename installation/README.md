# Trading Fund Management System - Installation Guide

Welcome to the Trading Fund Management System! This guide will help you install the complete system on your self-hosted Supabase instance.

## 📋 Prerequisites

- Self-hosted Supabase instance running
- Supabase CLI installed (`npm install -g supabase`)
- Database access (PostgreSQL)
- Resend API account (for email notifications)
- Node.js installed

## 🚀 Installation Methods

### Method 1: Automated Installation (Recommended)

1. **Access the Installation Page**
   - Navigate to `/installation` in your application
   - Follow the step-by-step wizard

2. **Configure Database Connection**
   - Enter your Supabase URL or IP address
   - Provide your Supabase Anon Key
   - Enter your Project ID

3. **Complete Automated Setup**
   - The system will automatically create all tables and functions
   - Set up the super admin account
   - Configure email services
   - Verify the installation

### Method 2: Manual Installation

#### Step 1: Database Setup

1. Connect to your Supabase database
2. Run the complete installation script:
   ```sql
   -- Execute the contents of database-setup-complete.sql
   ```
   This will create all tables, functions, policies, triggers, and default settings.

#### Step 2: Configure Environment Variables

In your Supabase dashboard, go to Settings > Edge Functions and add these secrets:
- `RESEND_API_KEY`: Your Resend API key for email notifications
- `SUPABASE_URL`: Your Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
- `ADMIN_NOTIFICATION_EMAIL`: Email address for admin notifications

#### Step 3: Deploy Edge Functions

```bash
# Make the script executable
chmod +x edge-functions-deploy.sh

# Run the deployment script
./edge-functions-deploy.sh
```

#### Step 4: Update Application Configuration

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

#### Step 5: Create Super Admin User

1. First, create a user through your Supabase Auth interface
2. Note the user's email address
3. Edit `create-super-admin.sql` and update the email
4. Run the script to promote the user to super admin

#### Step 6: Verify Installation

1. Start the application: `npm run dev`
2. Test user registration and login
3. Test admin dashboard features
4. Verify email notifications work
5. Check real-time updates

## 🔧 System Components

### Database Tables
- **profiles**: User profile information and roles
- **fund_data**: Trading fund management data with default settings
- **trading_history**: Trading transaction records
- **transaction_history**: Fund transfer records
- **admin_notifications**: System notifications
- **user_settings**: User preferences and configurations
- **economic_events**: Economic calendar data
- **app_settings**: System configuration

### Edge Functions
- **security-monitor**: Handles security events and alerts
- **send-admin-notification**: Sends email notifications
- **approve-user**: Admin function to approve user registrations
- **delete-user**: Admin function to delete users
- **forex-events-fetcher**: Fetches economic calendar data
- **setup-installation-database**: Automated database setup
- **create-installation-admin**: Creates admin accounts
- **configure-installation-email**: Configures email services
- **complete-installation**: Finalizes installation
- **test-installation-connection**: Tests system connectivity

### Key Features
- Role-based access control (super_admin, admin, user)
- Real-time updates for trading data
- Email notification system
- Secure fund management with audit trails
- Multi-user support with sub-user functionality
- Economic calendar integration
- Currency support (USD/USDCent)
- Mobile-responsive design
- Automated default settings for new users

## 🔄 Migration Support

### From Existing Installation
1. Backup your existing database
2. Run the new `database-setup-complete.sql` script
3. The script will update existing tables and add new features
4. Update your Edge Functions using the deployment script
5. Test all functionality

### Fresh Installation
- Follow the automated installation method for the best experience
- All tables, functions, and default settings are created automatically
- Default values for profit distribution: Active 0%, Reserve 30%, Profit 70%
- Default risk percentage: 40%

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

**Currency Display Issues**
- Check if the currency context is properly implemented
- Verify database default values are set correctly
- Test with both USD and USDCent modes

### Support

If you encounter issues:
1. Check the console logs in your browser
2. Review Edge Function logs in Supabase dashboard
3. Verify all configuration values are correct
4. Ensure all required environment variables are set
5. Use the installation page for guided setup

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

## 🔧 Configuration Details

### Default Settings
- **Profit Distribution**: Active Fund 0%, Reserve Fund 30%, Profit Fund 70%
- **Risk Percentage**: 40%
- **Currency**: USD with cent support
- **Language**: English
- **Storage**: Public bucket for file uploads

### Security Features
- Row Level Security (RLS) enabled on all tables
- Role-based access control
- Secure API endpoints
- Authentication required for sensitive operations
- Audit trails for all transactions

---

**Installation Complete!** 🎉

Your Trading Fund Management System is now ready to use. The system includes:
- ✅ Complete database schema with default values
- ✅ All Edge Functions deployed
- ✅ Email notification system
- ✅ Real-time updates
- ✅ Mobile-responsive interface
- ✅ Economic calendar integration
- ✅ Multi-currency support
- ✅ Automated installation wizard

Login with your super admin account to start managing users and trading funds!