import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface InstallationStep {
  title: string;
  description: string;
  completed: boolean;
}

const Installation = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { toast } = useToast();

  const [config, setConfig] = useState({
    supabaseUrl: "",
    supabaseAnonKey: "",
    projectId: "",
    adminEmail: "",
    resendApiKey: "",
    adminNotificationEmail: ""
  });

  // Helper to persist step across reloads
  const goToStep = (n: number) => {
    setCurrentStep(n);
    try { localStorage.setItem('installation_current_step', String(n)); } catch {}
  };

  // Load saved config and step if present
  useEffect(() => {
    try {
      const raw = localStorage.getItem('supabase_config');
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig((c) => ({
          ...c,
          supabaseUrl: parsed.supabaseUrl ?? c.supabaseUrl,
          supabaseAnonKey: parsed.supabaseAnonKey ?? c.supabaseAnonKey,
          projectId: parsed.projectId ?? c.projectId,
        }));
      }
      const savedStep = localStorage.getItem('installation_current_step');
      if (savedStep) {
        setCurrentStep(parseInt(savedStep, 10));
      }
    } catch {}
  }, []);

  const applyDatabaseConfig = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      localStorage.setItem('supabase_config', JSON.stringify({
        supabaseUrl: config.supabaseUrl,
        supabaseAnonKey: config.supabaseAnonKey,
        projectId: config.projectId,
      }));
      // Continue to next step after reload
      localStorage.setItem('installation_current_step', '1');
      setSuccess("Configuration saved. Reloading with new connection...");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      setError("Failed to save configuration");
    } finally {
      setLoading(false);
    }
  };

  const steps: InstallationStep[] = [
    {
      title: "Database Configuration",
      description: "Configure your Supabase database connection",
      completed: false
    },
    {
      title: "Database Setup",
      description: "Create tables, functions, and policies",
      completed: false
    },
    {
      title: "Admin Account",
      description: "Create the first super admin account",
      completed: false
    },
    {
      title: "Email Service",
      description: "Configure email notifications",
      completed: false
    },
    {
      title: "Verification",
      description: "Verify installation and complete setup",
      completed: false
    }
  ];

  const testDatabaseConnection = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await supabase.functions.invoke('test-installation-connection', {
        body: {
          supabaseUrl: config.supabaseUrl,
          supabaseAnonKey: config.supabaseAnonKey,
          projectId: config.projectId
        }
      });

      if (response.error) throw response.error;

      setSuccess("Database connection successful!");
      setTimeout(() => goToStep(1), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  const setupDatabase = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await supabase.functions.invoke('setup-installation-database', {
        body: { projectId: config.projectId }
      });

      if (response.error) throw response.error;

      setSuccess("Database setup completed successfully!");
      setTimeout(() => goToStep(2), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to setup database");
    } finally {
      setLoading(false);
    }
  };

  const createAdminAccount = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await supabase.functions.invoke('create-installation-admin', {
        body: { 
          adminEmail: config.adminEmail,
          projectId: config.projectId
        }
      });

      if (response.error) throw response.error;

      setSuccess("Admin account created successfully! Check your email for login details.");
      setTimeout(() => goToStep(3), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to create admin account");
    } finally {
      setLoading(false);
    }
  };

  const configureEmailService = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await supabase.functions.invoke('configure-installation-email', {
        body: {
          resendApiKey: config.resendApiKey,
          adminNotificationEmail: config.adminNotificationEmail,
          projectId: config.projectId
        }
      });

      if (response.error) throw response.error;

      setSuccess("Email service configured successfully!");
      setTimeout(() => goToStep(4), 1000);
    } catch (err: any) {
      setError(err.message || "Failed to configure email service");
    } finally {
      setLoading(false);
    }
  };

  const completeInstallation = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await supabase.functions.invoke('complete-installation', {
        body: { projectId: config.projectId }
      });

      if (response.error) throw response.error;

      toast({
        title: "Installation Complete!",
        description: "Your Trading Fund Management System is ready to use.",
      });

      // Redirect to main app after successful installation
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to complete installation");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="supabaseUrl">Supabase URL or IP</Label>
              <Input
                id="supabaseUrl"
                placeholder="http://192.168.1.10:8000"
                value={config.supabaseUrl}
                onChange={(e) => setConfig({...config, supabaseUrl: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supabaseAnonKey">Supabase Anon Key</Label>
              <Input
                id="supabaseAnonKey"
                placeholder="Your anon key"
                value={config.supabaseAnonKey}
                onChange={(e) => setConfig({...config, supabaseAnonKey: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectId">Project ID</Label>
              <Input
                id="projectId"
                placeholder="your-project-id"
                value={config.projectId}
                onChange={(e) => setConfig({...config, projectId: e.target.value})}
              />
            </div>
            <Button onClick={applyDatabaseConfig} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & Continue
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create all necessary tables, functions, and security policies in your database.
            </p>
            <Button onClick={setupDatabase} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Setup Database
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Admin Email</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@yourdomain.com"
                value={config.adminEmail}
                onChange={(e) => setConfig({...config, adminEmail: e.target.value})}
              />
            </div>
            <Button onClick={createAdminAccount} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Admin Account
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resendApiKey">Resend API Key</Label>
              <Input
                id="resendApiKey"
                placeholder="re_your_api_key"
                value={config.resendApiKey}
                onChange={(e) => setConfig({...config, resendApiKey: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminNotificationEmail">Admin Notification Email</Label>
              <Input
                id="adminNotificationEmail"
                type="email"
                placeholder="notifications@yourdomain.com"
                value={config.adminNotificationEmail}
                onChange={(e) => setConfig({...config, adminNotificationEmail: e.target.value})}
              />
            </div>
            <Button onClick={configureEmailService} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Configure Email Service
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              <span>All steps completed successfully!</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Click below to finalize the installation and start using your Trading Fund Management System.
            </p>
            <Button onClick={completeInstallation} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Complete Installation
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Trading Fund Management System</CardTitle>
            <CardDescription>Installation Wizard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Steps */}
            <div className="space-y-2">
              {steps.map((step, index) => (
                <div key={index} className={`flex items-center space-x-3 p-2 rounded-lg ${
                  index === currentStep ? 'bg-primary/10' : 
                  index < currentStep ? 'bg-green-50 dark:bg-green-950' : 'bg-muted/50'
                }`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index < currentStep ? 'bg-green-600 text-white' :
                    index === currentStep ? 'bg-primary text-primary-foreground' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index < currentStep ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <div>
                    <p className={`font-medium ${index === currentStep ? 'text-primary' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Current Step Content */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">{steps[currentStep]?.title}</h3>
              {renderStepContent()}
            </div>

            {/* Status Messages */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {success}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Installation;