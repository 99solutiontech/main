#!/usr/bin/env node

// Automatic Configuration Updater for Trading Fund Management System
// This script updates the application configuration files with your Supabase instance details

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function updateConfiguration() {
  console.log('🔧 Trading Fund Management System Configuration Updater');
  console.log('='.repeat(60));
  
  // Get configuration from user
  const supabaseUrl = await prompt('Enter your Supabase URL: ');
  const anonKey = await prompt('Enter your Supabase Anon Key: ');
  const projectId = await prompt('Enter your Project ID: ');
  
  try {
    // Update src/integrations/supabase/client.ts
    console.log('\n📝 Updating Supabase client configuration...');
    
    const clientPath = path.join(process.cwd(), 'src/integrations/supabase/client.ts');
    let clientContent = fs.readFileSync(clientPath, 'utf8');
    
    clientContent = clientContent.replace(
      /const SUPABASE_URL = ".*";/,
      `const SUPABASE_URL = "${supabaseUrl}";`
    );
    
    clientContent = clientContent.replace(
      /const SUPABASE_PUBLISHABLE_KEY = ".*";/,
      `const SUPABASE_PUBLISHABLE_KEY = "${anonKey}";`
    );
    
    fs.writeFileSync(clientPath, clientContent);
    console.log('✅ Updated src/integrations/supabase/client.ts');
    
    // Update supabase/config.toml
    console.log('📝 Updating Supabase config...');
    
    const configPath = path.join(process.cwd(), 'supabase/config.toml');
    let configContent = fs.readFileSync(configPath, 'utf8');
    
    configContent = configContent.replace(
      /project_id = ".*"/,
      `project_id = "${projectId}"`
    );
    
    fs.writeFileSync(configPath, configContent);
    console.log('✅ Updated supabase/config.toml');
    
    console.log('\n🎉 Configuration updated successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Ensure your database schema is installed');
    console.log('2. Deploy Edge Functions');
    console.log('3. Create your first super admin user');
    console.log('4. Test the application');
    
  } catch (error) {
    console.error('❌ Error updating configuration:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  updateConfiguration();
}

module.exports = { updateConfiguration };