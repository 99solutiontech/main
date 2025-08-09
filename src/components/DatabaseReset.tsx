import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const DatabaseReset = () => {
  const [email, setEmail] = useState("ceoserd@gmail.com");
  const [password, setPassword] = useState("Mis@478992");
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const handleReset = async () => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please provide both email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-database', {
        body: {
          adminEmail: email,
          adminPassword: password
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Database reset successfully! Fresh super admin user created.",
      });
      
      setShowConfirm(false);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reset database",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-md border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Database Reset
          </CardTitle>
          <CardDescription>
            This will permanently delete ALL data and create a fresh super admin user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={() => setShowConfirm(true)}
            variant="destructive"
            className="w-full"
          >
            Reset Database
          </Button>
        </CardContent>
      </Card>

      {showConfirm && (
        <Card className="w-full max-w-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <RefreshCw className="h-5 w-5" />
              Confirm Database Reset
            </CardTitle>
            <CardDescription>
              Enter credentials for the new super admin user:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Admin Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Strong password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowConfirm(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReset}
                variant="destructive"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Resetting..." : "Confirm Reset"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};