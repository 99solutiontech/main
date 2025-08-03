import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);

        // Check user profile and status
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (error || !profile) {
          console.error('Profile error:', error);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Check if user is active
        if (!profile.is_active) {
          toast({
            title: "Account Suspended",
            description: "Please contact admin your account was suspended",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Check registration status
        if (profile.registration_status === 'pending') {
          toast({
            title: "Account Pending",
            description: "Your account is still waiting for admin approval. Please wait for confirmation.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        // Check required role if specified
        if (requiredRole && profile.role !== requiredRole) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to access this page",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Auth check error:', error);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setSession(null);
        setIsAuthorized(false);
        return;
      }

      setSession(session);
      setUser(session.user);
      
      // Re-check authorization when auth state changes
      await checkAuth();
    });

    return () => subscription.unsubscribe();
  }, [requiredRole, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || !isAuthorized) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;