# Fresh System Setup Guide

## Complete Installation for Self-Hosted Supabase

This guide provides complete instructions for setting up the Trading Fund Management System on a fresh self-hosted Supabase instance.

### Quick Setup (Automated)

1. **Start the Application**
   ```bash
   npm install
   npm run dev
   ```

2. **Access Installation Wizard**
   - Navigate to `/installation` in your browser
   - Follow the step-by-step guided installation

3. **Configure Your System**
   - Enter your Supabase URL/IP address
   - Provide your Supabase credentials
   - Set up admin account
   - Configure email services

### Manual Setup

#### 1. Database Installation

Execute the complete database setup script in your Supabase SQL Editor:

```sql
-- Run the contents of database-setup-complete.sql
-- This creates all tables, functions, policies, and default settings
```

#### 2. Environment Configuration

Set these secrets in your Supabase Edge Functions settings:

```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
ADMIN_NOTIFICATION_EMAIL=admin@yourdomain.com
```

#### 3. Deploy Edge Functions

```bash
# Navigate to your project directory
cd your-trading-system

# Make deployment script executable
chmod +x installation/edge-functions-deploy.sh

# Deploy all functions
./installation/edge-functions-deploy.sh
```

#### 4. Update Application Configuration

Run the configuration updater:

```bash
node installation/update-app-config.js
```

Or manually update:
- `src/integrations/supabase/client.ts` - Update Supabase URL and keys
- `supabase/config.toml` - Update project ID

#### 5. Create Super Admin

After installation, create your first admin user:

```sql
-- Update the email in this script and run it
-- installation/create-super-admin.sql
```

### Features Included

✅ **Complete Database Schema**
- All tables with proper relationships
- Row Level Security (RLS) policies
- Default values for new users
- Audit trails and transaction history

✅ **User Management**
- Role-based access control
- User registration and approval workflow
- Profile management with currency/language preferences

✅ **Trading Fund Management**
- Multiple fund types (Active, Reserve, Profit)
- Customizable profit distribution
- Risk management and lot size calculation
- Real-time updates

✅ **Economic Calendar**
- Automated forex events fetching
- Multi-currency filtering
- Real-time economic data

✅ **Mobile-Responsive Design**
- Full mobile support
- Touch-friendly interface
- Responsive layouts

✅ **Multi-Currency Support**
- USD and USD Cent modes
- Automatic currency conversion
- Consistent formatting

✅ **Email Notifications**
- Admin notifications
- User status updates
- System alerts

✅ **Security Features**
- SSL/TLS encryption
- Secure authentication
- Data validation
- Error handling

### Default Settings

The system comes pre-configured with optimal defaults:

**Profit Distribution:**
- Active Fund: 0%
- Reserve Fund: 30%
- Profit Fund: 70%

**Risk Management:**
- Default Risk Percentage: 40%
- Base Lot Size: 0.01
- Base Capital: $1,000

**User Preferences:**
- Currency: USD
- Language: English

### Post-Installation

After successful installation:

1. **Test the system:**
   - Create a test user
   - Verify trading functionality
   - Check email notifications
   - Test mobile interface

2. **Configure additional settings:**
   - Set up custom profit distributions
   - Configure risk parameters
   - Customize email templates

3. **Backup your system:**
   - Export database schema
   - Save configuration files
   - Document custom settings

### Support

If you encounter any issues:

1. Check the installation logs
2. Verify all environment variables are set
3. Ensure database migrations completed successfully
4. Review Edge Function logs in Supabase dashboard
5. Use the automated installation wizard for guided setup

### Maintenance

**Regular Tasks:**
- Database backups (daily recommended)
- Monitor system performance
- Update edge functions as needed
- Review security settings

**Updates:**
- Check for system updates
- Apply security patches
- Update dependencies
- Test new features

---

Your Trading Fund Management System is now ready for production use with full self-hosted Supabase integration!