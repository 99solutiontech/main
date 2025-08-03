import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEventData {
  type: 'failed_login' | 'suspicious_activity' | 'multiple_sessions' | 'data_breach_attempt';
  user_id?: string;
  ip_address?: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const useSecurityMonitor = () => {
  // Track failed login attempts
  const trackFailedLogin = useCallback(async (email: string, ip_address?: string) => {
    try {
      await supabase.functions.invoke('security-monitor', {
        body: {
          type: 'failed_login',
          ip_address,
          details: `Failed login attempt for email: ${email}`,
          severity: 'medium'
        }
      });
    } catch (error) {
      console.error('Failed to track security event:', error);
    }
  }, []);

  // Track suspicious activity
  const trackSuspiciousActivity = useCallback(async (user_id: string, details: string) => {
    try {
      await supabase.functions.invoke('security-monitor', {
        body: {
          type: 'suspicious_activity',
          user_id,
          details,
          severity: 'high'
        }
      });
    } catch (error) {
      console.error('Failed to track security event:', error);
    }
  }, []);

  // Track multiple sessions
  const trackMultipleSessions = useCallback(async (user_id: string, sessionCount: number) => {
    try {
      await supabase.functions.invoke('security-monitor', {
        body: {
          type: 'multiple_sessions',
          user_id,
          details: `User has ${sessionCount} active sessions`,
          severity: 'medium'
        }
      });
    } catch (error) {
      console.error('Failed to track security event:', error);
    }
  }, []);

  // Monitor session activity
  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    const checkSessionActivity = async () => {
      const { data: session } = await supabase.auth.getSession();
      if (session?.session) {
        // This will work after migration - for now just log
        console.log('Session activity tracking will be enabled after migration');
      }
    };

    // Check session activity every 5 minutes
    sessionCheckInterval = setInterval(checkSessionActivity, 5 * 60 * 1000);
    
    // Initial check
    checkSessionActivity();

    return () => {
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, []);

  return {
    trackFailedLogin,
    trackSuspiciousActivity,
    trackMultipleSessions,
  };
};