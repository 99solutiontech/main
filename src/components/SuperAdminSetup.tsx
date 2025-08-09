import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const SuperAdminSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-admin');

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Super admin user created! You can now sign in with ceoserd@gmail.com",
      });
    } catch (error: any) {
      console.error('Setup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create super admin",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <UserPlus className="h-5 w-5" />
          Create Super Admin
        </CardTitle>
        <CardDescription>
          Create a super admin user (ceoserd@gmail.com) with $10,000 initial funds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleSetup}
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Super Admin"}
        </Button>
      </CardContent>
    </Card>
  );
};