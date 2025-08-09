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
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);

        // Check user profile and status with timeout to avoid hanging
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
        );

        const { data: profile, error } = await Promise.race([
          profilePromise as any,
          timeoutPromise
        ]) as any;

        if (error || !profile) {
          console.error('Profile error:', error);
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
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
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
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
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
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
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setIsAuthorized(true);
        setLoading(false);
      } catch (error) {
        console.error('Auth check error:', error);
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setIsAuthorized(false);
        setLoading(false);
      }
    };

    // Initial auth check only
    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setSession(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      
      // Re-check auth on token refresh but not on initial sign in to avoid duplicate calls
      if (event === 'TOKEN_REFRESHED') {
        await checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, [requiredRole]);

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