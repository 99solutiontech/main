// API Adapter for dual backend support (Supabase + CyberPanel)
// This allows the React app to work with both backends

import { supabase } from '@/integrations/supabase/client';

// Detect backend type
const isSupabaseBackend = () => {
  return window.location.hostname.includes('supabase') || 
         import.meta.env.MODE === 'development' ||
         localStorage.getItem('backend_type') === 'supabase';
};

// API configuration
const API_CONFIG = {
  cyberpanel: {
    baseUrl: window.location.origin + '/api',
    endpoints: {
      auth: '/auth',
      funds: '/funds',
      trades: '/trades',
      transactions: '/transactions',
      admin: '/admin'
    }
  }
};

// Authentication adapter
export class AuthAdapter {
  static async signUp(email: string, password: string, fullName: string, traderName: string) {
    if (isSupabaseBackend()) {
      // Supabase implementation
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            trader_name: traderName
          }
        }
      });
      
      if (error) throw error;
      
      // Create profile
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: data.user.id,
            full_name: fullName,
            trader_name: traderName
          });
        
        if (profileError) throw profileError;
      }
      
      return { user: data.user, session: data.session };
    } else {
      // CyberPanel implementation
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          fullName,
          traderName
        })
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }
      
      return result;
    }
  }

  static async signIn(email: string, password: string) {
    if (isSupabaseBackend()) {
      // Supabase implementation
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return { user: data.user, session: data.session };
    } else {
      // CyberPanel implementation
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }
      
      // Store token
      localStorage.setItem('auth_token', result.token);
      return result;
    }
  }

  static async signOut() {
    if (isSupabaseBackend()) {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } else {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${API_CONFIG.cyberpanel.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
        localStorage.removeItem('auth_token');
      }
    }
  }

  static async getCurrentUser() {
    if (isSupabaseBackend()) {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } else {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;
      
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('auth_token');
        return null;
      }
      
      const result = await response.json();
      return result.user;
    }
  }
}

// Helper function to check if using Supabase backend
export const useSupabase = () => isSupabaseBackend();

// Simplified database helpers for type safety
export const apiCall = {
  async get(endpoint: string, params?: Record<string, any>) {
    if (isSupabaseBackend()) {
      // Use existing Supabase calls in components
      throw new Error('Use supabase client directly for Supabase backend');
    } else {
      const token = localStorage.getItem('auth_token');
      const queryParams = params ? '?' + new URLSearchParams(params).toString() : '';
      
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}${endpoint}${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      return response.json();
    }
  },

  async post(endpoint: string, data?: any) {
    if (isSupabaseBackend()) {
      throw new Error('Use supabase client directly for Supabase backend');
    } else {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      return response.json();
    }
  },

  async put(endpoint: string, data?: any) {
    if (isSupabaseBackend()) {
      throw new Error('Use supabase client directly for Supabase backend');
    } else {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      return response.json();
    }
  },

  async delete(endpoint: string) {
    if (isSupabaseBackend()) {
      throw new Error('Use supabase client directly for Supabase backend');
    } else {
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_CONFIG.cyberpanel.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (!response.ok) {
        throw new Error('API request failed');
      }
      
      return response.json();
    }
  }
}

// Real-time subscription helper
export const subscribeToChanges = (table: string, callback: (payload: any) => void) => {
  if (isSupabaseBackend()) {
    return supabase
      .channel(`public:${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
      .subscribe();
  } else {
    // For CyberPanel, implement polling
    const interval = setInterval(async () => {
      try {
        // Basic polling implementation
        // Components can implement their own refresh logic
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 10000); // Poll every 10 seconds
    
    return {
      unsubscribe: () => clearInterval(interval)
    };
  }
};