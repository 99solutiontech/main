#!/bin/bash

# Edge Functions Deployment Script for Trading Fund Management System
# This script deploys all required Edge Functions to your Supabase instance

set -e

echo "🚀 Deploying Edge Functions for Trading Fund Management System..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if user is logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Please log in to Supabase CLI first:"
    echo "supabase login"
    exit 1
fi

echo "📋 Required Environment Variables:"
echo "- RESEND_API_KEY (for email notifications)"
echo "- SUPABASE_URL"
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo ""

read -p "Have you set up all required environment variables in your Supabase project? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please set up the required environment variables first:"
    echo "1. Go to your Supabase dashboard"
    echo "2. Navigate to Settings > Edge Functions"
    echo "3. Add the required environment variables"
    echo "4. Run this script again"
    exit 1
fi

# Deploy functions
echo "📦 Deploying security-monitor function..."
supabase functions deploy security-monitor

echo "📦 Deploying send-admin-notification function..."
supabase functions deploy send-admin-notification

echo "📦 Deploying approve-user function..."
supabase functions deploy approve-user

echo "📦 Deploying delete-user function..."
supabase functions deploy delete-user

echo "✅ All Edge Functions deployed successfully!"
echo ""
echo "🔧 Next steps:"
echo "1. Test each function to ensure they're working correctly"
echo "2. Update your application configuration files"
echo "3. Create your first super admin user"
echo ""
echo "🧪 Test your functions:"
echo "- Check the Edge Functions logs in your Supabase dashboard"
echo "- Test the email notification system"
echo "- Verify user approval and deletion workflows"