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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!session?.user) {
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session.user);

        // If no role is required, allow access immediately to avoid blocking UI
        if (!requiredRole) {
          setIsAuthorized(true);
          setLoading(false);
          return;
        }

        // Check user profile and status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('status, role')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          console.error('Profile error:', profileError);
          await supabase.auth.signOut();
          setUser(null);
          setSession(null);
          setIsAuthorized(false);
          setLoading(false);
          return;
        }

        // Enforce account status
        if (profile.status === 'suspended') {
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
        if (profile.status === 'pending') {
          toast({
            title: "Account Pending",
            description: "Your account is waiting for super admin approval. Please contact the administrator.",
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

    // Set up auth state listener (no async operations inside)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setSession(null);
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      // Update state on sign-in/initial
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(session ?? null);
        setUser(session?.user ?? null);
        // If no role required, authorize immediately to avoid blocking UI
        if (!requiredRole) {
          setIsAuthorized(true);
          setLoading(false);
          return;
        }
        // Defer full check
        setTimeout(() => {
          checkAuth();
        }, 0);
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