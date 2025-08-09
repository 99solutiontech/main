import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ConfigurationProps {
  onSuccess: () => void;
}

export const SelfHostedConfiguration: React.FC<ConfigurationProps> = ({ onSuccess }) => {
  const [config, setConfig] = useState({
    supabaseUrl: 'https://31.97.189.98:8443',
    adminEmail: 'ceoserd@gmail.com',
    adminPassword: 'Mis@478992'
  });
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [status, setStatus] = useState<{type: 'success' | 'error' | null, message: string}>({type: null, message: ''});

  const handleConfigure = async () => {
    setIsConfiguring(true);
    setStatus({type: null, message: ''});

    try {
      // Call the edge function to configure self-hosted Supabase
      const { data, error } = await supabase.functions.invoke('configure-self-hosted', {
        body: {
          supabaseUrl: config.supabaseUrl,
          serviceRoleKey: 'SELF_HOSTED_SERVICE_ROLE_KEY', // This will be replaced by the actual secret
          adminEmail: config.adminEmail,
          adminPassword: config.adminPassword
        }
      });

      if (error) {
        throw error;
      }

      setStatus({
        type: 'success', 
        message: `Configuration successful! Admin user created: ${data.adminEmail}`
      });

      // Wait a moment then call success callback
      setTimeout(() => {
        onSuccess();
      }, 2000);

    } catch (error) {
      console.error('Configuration error:', error);
      setStatus({
        type: 'error',
        message: error.message || 'Configuration failed. Please check your settings and try again.'
      });
    } finally {
      setIsConfiguring(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Configure Self-Hosted Supabase</span>
        </CardTitle>
        <CardDescription>
          Set up your self-hosted Supabase instance with all required tables, policies, and admin user.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="supabaseUrl">Supabase URL</Label>
            <Input
              id="supabaseUrl"
              value={config.supabaseUrl}
              onChange={(e) => setConfig(prev => ({...prev, supabaseUrl: e.target.value}))}
              placeholder="https://your-supabase-instance.com"
              disabled={isConfiguring}
            />
          </div>

          <div>
            <Label htmlFor="adminEmail">Admin Email</Label>
            <Input
              id="adminEmail"
              type="email"
              value={config.adminEmail}
              onChange={(e) => setConfig(prev => ({...prev, adminEmail: e.target.value}))}
              placeholder="admin@yourdomain.com"
              disabled={isConfiguring}
            />
          </div>

          <div>
            <Label htmlFor="adminPassword">Admin Password</Label>
            <Input
              id="adminPassword"
              type="password"
              value={config.adminPassword}
              onChange={(e) => setConfig(prev => ({...prev, adminPassword: e.target.value}))}
              placeholder="Strong password for admin account"
              disabled={isConfiguring}
            />
          </div>
        </div>

        {status.type && (
          <Alert variant={status.type === 'error' ? 'destructive' : 'default'}>
            {status.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{status.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <Button 
            onClick={handleConfigure} 
            disabled={isConfiguring || !config.supabaseUrl || !config.adminEmail || !config.adminPassword}
            className="w-full"
          >
            {isConfiguring ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Configuring Supabase...
              </>
            ) : (
              'Configure Self-Hosted Supabase'
            )}
          </Button>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">This will:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Enable required PostgreSQL extensions (uuid-ossp, pgcrypto)</li>
              <li>Create all necessary tables (profiles, fund_data, trading_history, etc.)</li>
              <li>Set up Row Level Security policies</li>
              <li>Create admin user with super_admin role</li>
              <li>Insert initial fund data ($10,000 in diamond mode)</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};