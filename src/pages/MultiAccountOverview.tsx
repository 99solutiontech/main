import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppThemeProvider } from '@/contexts/AppThemeContext';
import { User, Session } from '@supabase/supabase-js';
import { Gem, LogOut, TrendingUp, BarChart3, Calendar, ArrowRight } from 'lucide-react';
import UserProfileMenu from '@/components/profile/UserProfileMenu';
import MultiAccountFundOverview from '@/components/trading/MultiAccountFundOverview';
import MultiAccountCapitalGrowth from '@/components/trading/MultiAccountCapitalGrowth';
import MultiAccountQuarterlyCalendar from '@/components/trading/MultiAccountQuarterlyCalendar';
import EconomicNewsBar from '@/components/trading/EconomicNewsBar';
import ErrorBoundary from '@/components/ErrorBoundary';

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  trader_name?: string;
  role: string;
  status: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  address?: string;
  phone_number?: string;
  currency_unit?: string;
  language?: string;
  created_at: string;
  updated_at: string;
}

interface SubUser {
  id: string;
  name: string;
  mode: 'diamond' | 'gold';
  initial_capital: number;
  total_capital: number;
  active_fund: number;
  reserve_fund: number;
  profit_fund: number;
  created_at: string;
}

const MultiAccountOverview = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentMode, setCurrentMode] = useState<'diamond' | 'gold'>('diamond');
  const [loading, setLoading] = useState(true);
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const navigate = useNavigate();
  const { t } = useLanguage();

  useEffect(() => {
    const initializeOverview = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          navigate('/auth');
          return;
        }

        setSession(session);
        setUser(session.user);
        
        await loadUserProfile(session.user.id);
        await loadAllSubUsers(session.user.id);
      } catch (error) {
        console.error('Overview initialization error:', error);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    initializeOverview();
  }, [navigate]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAllSubUsers = async (userId: string) => {
    try {
      // Load main account
      const { data: mainAccountData, error: mainError } = await supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null)
        .single();

      // Load sub accounts
      const { data: subAccountsData, error: subError } = await supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .not('sub_user_name', 'is', null);

      const allAccounts: SubUser[] = [];

      // Add main account if it exists
      if (mainAccountData && !mainError) {
        allAccounts.push({
          id: mainAccountData.id,
          name: 'Main Account',
          mode: mainAccountData.mode as 'diamond' | 'gold',
          initial_capital: mainAccountData.initial_capital,
          total_capital: mainAccountData.total_capital,
          active_fund: mainAccountData.active_fund,
          reserve_fund: mainAccountData.reserve_fund,
          profit_fund: mainAccountData.profit_fund,
          created_at: mainAccountData.created_at,
        });
      }

      // Add sub accounts
      if (subAccountsData && !subError) {
        subAccountsData.forEach(account => {
          allAccounts.push({
            id: account.id,
            name: account.sub_user_name || 'Unnamed Account',
            mode: account.mode as 'diamond' | 'gold',
            initial_capital: account.initial_capital,
            total_capital: account.total_capital,
            active_fund: account.active_fund,
            reserve_fund: account.reserve_fund,
            profit_fund: account.profit_fund,
            created_at: account.created_at,
          });
        });
      }

      setSubUsers(allAccounts);
    } catch (error) {
      console.error('Error loading sub users:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      navigate('/auth');
    }
  };

  const handleModeChange = (newMode: 'diamond' | 'gold') => {
    setCurrentMode(newMode);
    if (user) {
      loadAllSubUsers(user.id);
    }
  };

  const navigateToAccount = (accountName: string) => {
    const params = new URLSearchParams();
    params.set('mode', currentMode);
    if (accountName !== 'Main Account') {
      params.set('subUser', accountName);
    }
    navigate(`/dashboard?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    );
  }

  if (!profile || !user) {
    return null;
  }

  return (
    <ErrorBoundary>
      <AppThemeProvider>
        <ThemeProvider tradingMode={currentMode} onModeChange={handleModeChange}>
          <div className="min-h-screen bg-background">
            <header className="border-b bg-card">
              <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Gem className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold tracking-wider">Moneyx 8.8</h1>
                      <p className="text-sm text-muted-foreground">
                        {t('multiAccountOverview')} - {profile?.trader_name || profile?.full_name || user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate('/dashboard')}
                      className="flex items-center gap-2"
                    >
                      <ArrowRight className="h-4 w-4" />
                      {t('viewIndividualAccounts')}
                    </Button>
                    <UserProfileMenu onSignOut={handleSignOut} displayName={profile?.trader_name || profile?.full_name || user.email} />
                  </div>
                </div>
              </div>
            </header>

            <main className="container mx-auto px-4 py-8">
              <div className="space-y-8">
                <EconomicNewsBar />
                
                <MultiAccountFundOverview 
                  userId={user.id}
                  mode={currentMode}
                  subUsers={subUsers}
                  onAccountClick={navigateToAccount}
                />

                <Tabs defaultValue="growth" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="growth" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      {t('capitalGrowth')}
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {t('quarterlyCalendar')}
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="growth" className="space-y-6">
                    <MultiAccountCapitalGrowth 
                      userId={user.id}
                      mode={currentMode}
                      subUsers={subUsers}
                    />
                  </TabsContent>
                  
                  <TabsContent value="calendar" className="space-y-6">
                    <MultiAccountQuarterlyCalendar 
                      userId={user.id}
                      mode={currentMode}
                      subUsers={subUsers}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </main>
          </div>
        </ThemeProvider>
      </AppThemeProvider>
    </ErrorBoundary>
  );
};

export default MultiAccountOverview;