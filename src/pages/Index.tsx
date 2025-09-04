import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

const Index = () => {
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkAuth = async () => {
      try {
        // Check if installation is in progress
        const installationInProgress = localStorage.getItem('INSTALLATION_IN_PROGRESS');
        if (installationInProgress) {
          console.log('Installation in progress, redirecting to installation page');
          navigate('/installation');
          return;
        }

        console.log('Checking authentication...');
        
        // Get session without timeout - let it complete naturally
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          navigate('/auth');
          return;
        }

        if (!session?.user) {
          console.log('No session found, redirecting to auth');
          navigate('/auth');
          return;
        }

        console.log('Session found, redirecting to overview');
        navigate('/overview');
        
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/auth');
      } finally {
        // Small delay to prevent rapid redirects
        timeoutId = setTimeout(() => setLoading(false), 100);
      }
    };

    checkAuth();
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [navigate, t]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
