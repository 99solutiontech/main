# Complete Migration Guide to VPS Supabase

## Prerequisites
- Domain: moneyxmpm.com
- VPS IP: 31.97.189.98
- VPS Supabase: http://31.97.189.98:8000

## Step 1: Get VPS Supabase Configuration
1. Access your VPS Supabase at `http://31.97.189.98:8000/project/default`
2. Go to Settings → API and copy:
   - Project URL (e.g., `http://31.97.189.98:8000`)
   - Anon Key
   - Service Role Key
3. Go to Settings → General and copy Project ID

## Step 2: Setup Database Schema on VPS
1. Run the complete `installation/database-setup.sql` on your VPS Supabase
2. This will create all tables, RLS policies, and functions

## Step 3: Export Data from Current Supabase
1. Go to SQL Editor on your current Supabase.com
2. Run each query from `migration/export-data.sql`
3. Save each result as CSV files:
   - profiles.csv
   - fund_data.csv
   - trading_history.csv
   - transaction_history.csv
   - admin_notifications.csv

## Step 4: Import Data to VPS Supabase
1. Upload CSV files to your VPS
2. SSH to your VPS: `ssh root@31.97.189.98`
3. Run import commands from `migration/import-data.sql`
4. Adjust file paths in the import script

## Step 5: Update Application Configuration
The AI will update these files with your VPS details:
- `src/integrations/supabase/client.ts`
- `supabase/config.toml`

## Step 6: Setup Edge Functions
1. Deploy all edge functions to your VPS Supabase
2. Configure secrets in VPS dashboard

## Step 7: Domain Configuration
1. Update DNS at your registrar:
   - A Record: @ → 31.97.189.98
   - A Record: www → 31.97.189.98
2. Setup nginx/apache reverse proxy on VPS
3. Configure SSL certificate

## Step 8: Create Admin Account
1. Register first user through your app
2. Run `installation/create-super-admin.sql` with your email
3. Update the email in the script before running

## Step 9: Test Everything
1. Test authentication
2. Test all trading features
3. Test admin functions
4. Verify data integrity