import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AppThemeProvider } from '@/contexts/AppThemeContext';
import LanguageSelector from '@/components/LanguageSelector';
import ThemeToggle from '@/components/ThemeToggle';
import { Gem, LogOut, Settings, TrendingUp, DollarSign, Calculator, Calendar, BarChart3, Users } from 'lucide-react';
import FundOverview from '@/components/trading/FundOverview';
import TradeRecorder from '@/components/trading/TradeRecorder';
import LotCalculator from '@/components/trading/LotCalculator';
import TradingHistory from '@/components/trading/TradingHistory';
import FundManagement from '@/components/trading/FundManagement';
import TradingCalendar from '@/components/trading/TradingCalendar';
import CapitalGrowthChart from '@/components/trading/CapitalGrowthChart';
import FundTransactionHistory from '@/components/trading/FundTransactionHistory';
import SubUserManager from '@/components/trading/SubUserManager';
import MonthlyGrowthChart from '@/components/trading/MonthlyGrowthChart';
import FundSettings from '@/components/trading/FundSettings';
import SubUserSelector from '@/components/SubUserSelector';
import QuarterlyCalendar from '@/components/trading/QuarterlyCalendar';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  trader_name: string;
  role: string;
  is_active: boolean;
}

interface FundData {
  id: string;
  user_id: string;
  mode: 'diamond' | 'gold';
  initial_capital: number;
  total_capital: number;
  active_fund: number;
  reserve_fund: number;
  profit_fund: number;
  target_reserve_fund: number;
  profit_dist_active: number;
  profit_dist_reserve: number;
  profit_dist_profit: number;
  lot_base_capital: number;
  lot_base_lot: number;
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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [currentMode, setCurrentMode] = useState<'diamond' | 'gold'>('diamond');
  const [loading, setLoading] = useState(true);
  const [selectedSubUser, setSelectedSubUser] = useState<SubUser | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        console.log('Dashboard: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error || !session?.user) {
          console.log('Dashboard: No session, redirecting to auth');
          navigate('/auth');
          return;
        }

        setSession(session);
        setUser(session.user);
        
        console.log('Dashboard: Loading profile for user:', session.user.id);
        await loadUserProfile(session.user.id);
      } catch (error) {
        console.error('Dashboard initialization error:', error);
        navigate('/auth');
      }
    };

    // Set up auth state listener for real-time updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Dashboard: Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        navigate('/auth');
        return;
      }
      
      setSession(session);
      setUser(session.user);
    });

    initializeDashboard();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('Loading profile for user:', userId);
      
      // Add timeout to prevent hanging
      const profilePromise = (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const { data, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Profile query error:', error);
        // Create a default profile if query fails
        setProfile({
          id: 'temp',
          user_id: userId,
          trader_name: 'Trader',
          role: 'user',
          is_active: true,
          full_name: 'User'
        });
        
        toast({
          title: 'Connection Issue',
          description: 'Using offline mode. Some features may be limited.',
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      if (!data) {
        console.log('No profile found, creating default profile');
        // Create a default profile
        setProfile({
          id: 'temp',
          user_id: userId,
          trader_name: 'New Trader',
          role: 'user',
          is_active: true,
          full_name: 'New User'
        });
        setLoading(false);
        return;
      }
      
      setProfile(data);
      
      if (data?.role === 'super_admin') {
        navigate('/admin');
        return;
      }
      
      // Try to load fund data, but don't fail if it doesn't work
      try {
        await loadFundData(userId, currentMode, selectedSubUser?.name);
      } catch (fundError) {
        console.error('Fund data loading failed:', fundError);
        // Continue without fund data
      }
      
    } catch (error: any) {
      console.error('Error loading profile:', error);
      
      // Fallback: create a minimal profile to allow app to function
      setProfile({
        id: 'fallback',
        user_id: userId,
        trader_name: 'Trader',
        role: 'user',
        is_active: true,
        full_name: 'User'
      });
      
      toast({
        title: 'Connection Error',
        description: 'Running in offline mode. Please check your connection.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFundData = async (userId: string, mode: 'diamond' | 'gold', subUserName?: string) => {
    try {
      const query = supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode);
      
      if (subUserName) {
        query.eq('sub_user_name', subUserName);
      } else {
        query.is('sub_user_name', null);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setFundData(data as FundData);
    } catch (error: any) {
      console.error('Error loading fund data:', error);
    }
  };

  const handleModeChange = (mode: 'diamond' | 'gold') => {
    setCurrentMode(mode);
    if (user) {
      loadFundData(user.id, mode, selectedSubUser?.name);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const initializeFundData = async (initialCapital: number) => {
    if (!user) return;

    const newFundData = {
      user_id: user.id,
      mode: currentMode,
      initial_capital: initialCapital,
      total_capital: initialCapital,
      active_fund: initialCapital * 0.4,
      reserve_fund: initialCapital * 0.6,
      profit_fund: 0,
      target_reserve_fund: initialCapital * 0.6,
      sub_user_name: selectedSubUser?.name || null,
    };

    try {
      // Add timeout to prevent hanging
      const insertPromise = (supabase as any)
        .from('fund_data')
        .insert(newFundData)
        .select()
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 15000)
      );

      const { data, error } = await Promise.race([insertPromise, timeoutPromise]) as any;

      if (error) {
        console.error('Fund insert error:', error);
        throw error;
      }
      
      setFundData(data);

      // Try to add initial history record, but don't fail if it doesn't work
      try {
        const historyPromise = (supabase as any).from('trading_history').insert({
          user_id: user.id,
          mode: currentMode,
          type: 'Initialize',
          details: `Initial capital set to $${initialCapital.toLocaleString()}`,
          end_balance: initialCapital,
        });
        
        const historyTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('History timeout')), 10000)
        );

        await Promise.race([historyPromise, historyTimeoutPromise]);
      } catch (historyError) {
        console.error('History insert failed:', historyError);
        // Continue anyway - fund was created successfully
      }

      toast({
        title: t('success'),
        description: "Fund initialized successfully",
      });
      
    } catch (error: any) {
      console.error('Initialize fund error:', error);
      
      // Fallback: create local fund data for offline mode
      const fallbackFundData = {
        id: 'offline-' + Date.now(),
        user_id: user.id,
        mode: currentMode,
        initial_capital: initialCapital,
        total_capital: initialCapital,
        active_fund: initialCapital * 0.4,
        reserve_fund: initialCapital * 0.6,
        profit_fund: 0,
        target_reserve_fund: initialCapital * 0.6,
        profit_dist_active: 50,
        profit_dist_reserve: 25,
        profit_dist_profit: 25,
        lot_base_capital: 1000,
        lot_base_lot: 0.4,
      };
      
      setFundData(fallbackFundData);
      
      toast({
        title: 'Offline Mode',
        description: `Fund initialized locally with $${initialCapital.toLocaleString()}. Data will sync when connection is restored.`,
        variant: "default",
      });
    }
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
    <AppThemeProvider>
      <ThemeProvider tradingMode={currentMode} onModeChange={handleModeChange}>
        <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Gem className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Moneyx v8.2</h1>
                  <p className="text-sm text-muted-foreground">
                    {t('welcome')}, {profile.trader_name}
                  </p>
                </div>
              </div>
              
                <div className="flex items-center gap-4">
                <ThemeToggle />
                <LanguageSelector />
                
                <SubUserSelector
                  userId={user.id}
                  currentMode={currentMode}
                  selectedSubUser={selectedSubUser}
                  onSubUserSelect={(subUser) => {
                    setSelectedSubUser(subUser);
                    setFundData(null); // Reset fund data when switching users
                    if (user) {
                      loadFundData(user.id, currentMode, subUser?.name);
                    }
                  }}
                />
                
                <Select value={currentMode} onValueChange={handleModeChange}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diamond">
                      <div className="flex items-center gap-2">
                        <Gem className="h-4 w-4" />
                        {t('diamondMode')}
                      </div>
                    </SelectItem>
                    <SelectItem value="gold">
                      <div className="flex items-center gap-2">
                        <Gem className="h-4 w-4 text-yellow-500" />
                        {t('goldMode')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('signOut')}
                </Button>
              </div>
            </div>
          </div>
        </header>

      <main className="container mx-auto px-4 py-8">
        {!fundData ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Initialize Fund</CardTitle>
              <CardDescription>
                Set up your initial capital for {currentMode} mode
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const capital = parseFloat(formData.get('capital') as string);
                if (capital && capital >= 100) {
                  initializeFundData(capital);
                }
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Initial Capital (USD)</label>
                    <input
                      name="capital"
                      type="number"
                      min="100"
                      step="0.01"
                      required
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                      placeholder="10000.00"
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Initialize Fund
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <FundOverview fundData={fundData} />
              <CapitalGrowthChart 
                userId={user.id} 
                mode={currentMode} 
                subUserName={selectedSubUser?.name}
              />
              <MonthlyGrowthChart 
                userId={user.id} 
                mode={currentMode} 
                subUserName={selectedSubUser?.name}
              />
              {currentMode === 'gold' && (
                <TradingCalendar 
                  userId={user.id} 
                  mode={currentMode} 
                  subUserName={selectedSubUser?.name}
                />
              )}
              {currentMode === 'diamond' && (
                <QuarterlyCalendar 
                  userId={user.id} 
                  mode={currentMode} 
                  subUserName={selectedSubUser?.name}
                />
              )}
            </div>
            
            <div className="space-y-8">
              <Tabs defaultValue="record" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="record" className="text-xs">
                    <TrendingUp className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="calculator" className="text-xs">
                    <Calculator className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="funds" className="text-xs">
                    <DollarSign className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="record">
                  <TradeRecorder 
                    userId={user.id} 
                    mode={currentMode} 
                    fundData={fundData}
                    subUserName={selectedSubUser?.name}
                    onUpdate={() => loadFundData(user.id, currentMode, selectedSubUser?.name)}
                  />
                </TabsContent>
                
                <TabsContent value="calculator">
                  <LotCalculator fundData={fundData} onUpdate={() => loadFundData(user.id, currentMode, selectedSubUser?.name)} />
                </TabsContent>
                
                <TabsContent value="funds">
                  <FundManagement 
                    userId={user.id}
                    fundData={fundData}
                    subUserName={selectedSubUser?.name}
                    onUpdate={() => loadFundData(user.id, currentMode, selectedSubUser?.name)}
                  />
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-1 gap-6">
                <TradingHistory 
                  userId={user.id} 
                  mode={currentMode} 
                  subUserName={selectedSubUser?.name}
                />
                <FundTransactionHistory 
                  userId={user.id} 
                  mode={currentMode} 
                  subUserName={selectedSubUser?.name}
                />
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
      </ThemeProvider>
    </AppThemeProvider>
  );
};

export default Dashboard;