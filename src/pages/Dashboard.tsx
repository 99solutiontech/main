import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Gem, Star, LogOut, Settings, TrendingUp, DollarSign, Calculator, Calendar } from 'lucide-react';
import FundOverview from '@/components/trading/FundOverview';
import TradeRecorder from '@/components/trading/TradeRecorder';
import LotCalculator from '@/components/trading/LotCalculator';
import TradingHistory from '@/components/trading/TradingHistory';
import FundManagement from '@/components/trading/FundManagement';
import TradingCalendar from '@/components/trading/TradingCalendar';
import CapitalGrowthChart from '@/components/trading/CapitalGrowthChart';
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

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fundData, setFundData] = useState<FundData | null>(null);
  const [currentMode, setCurrentMode] = useState<'diamond' | 'gold'>('diamond');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserProfile(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session?.user) {
        navigate('/auth');
      } else {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
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
      
      if (data?.role === 'super_admin') {
        navigate('/admin');
        return;
      }
      
      loadFundData(userId, currentMode);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFundData = async (userId: string, mode: 'diamond' | 'gold') => {
    try {
      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .maybeSingle();

      if (error) throw error;
      setFundData(data);
    } catch (error: any) {
      console.error('Error loading fund data:', error);
    }
  };

  const handleModeChange = (mode: 'diamond' | 'gold') => {
    setCurrentMode(mode);
    if (user) {
      loadFundData(user.id, mode);
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
    };

    try {
      const { data, error } = await supabase
        .from('fund_data')
        .insert(newFundData)
        .select()
        .single();

      if (error) throw error;
      setFundData(data);

      // Add initial history record
      await supabase.from('trading_history').insert({
        user_id: user.id,
        mode: currentMode,
        type: 'Initialize',
        details: `Initial capital set to $${initialCapital.toLocaleString()}`,
        end_balance: initialCapital,
      });

      toast({
        title: "Success",
        description: "Fund initialized successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

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

  if (!profile || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Gem className="h-6 w-6 text-primary" />
                <Star className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Moneyx v8.2</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome, {profile.trader_name}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant={currentMode === 'diamond' ? 'default' : 'secondary'}>
                {currentMode === 'diamond' ? 'Diamond Mode' : 'Gold Mode'}
              </Badge>
              
              <Select value={currentMode} onValueChange={handleModeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diamond">
                    <div className="flex items-center gap-2">
                      <Gem className="h-4 w-4" />
                      Diamond
                    </div>
                  </SelectItem>
                  <SelectItem value="gold">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4" />
                      Gold
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
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
              <CapitalGrowthChart userId={user.id} mode={currentMode} />
            </div>
            
            <div className="space-y-8">
              <Tabs defaultValue="record" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="record" className="text-xs">
                    <TrendingUp className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="calculator" className="text-xs">
                    <Calculator className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="funds" className="text-xs">
                    <DollarSign className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="calendar" className="text-xs">
                    <Calendar className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="record">
                  <TradeRecorder 
                    userId={user.id} 
                    mode={currentMode} 
                    fundData={fundData}
                    onUpdate={() => loadFundData(user.id, currentMode)}
                  />
                </TabsContent>
                
                <TabsContent value="calculator">
                  <LotCalculator fundData={fundData} />
                </TabsContent>
                
                <TabsContent value="funds">
                  <FundManagement 
                    userId={user.id}
                    fundData={fundData}
                    onUpdate={() => loadFundData(user.id, currentMode)}
                  />
                </TabsContent>
                
                <TabsContent value="calendar">
                  {currentMode === 'gold' && (
                    <TradingCalendar userId={user.id} mode={currentMode} />
                  )}
                  {currentMode === 'diamond' && (
                    <Card>
                      <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground">
                          Calendar view is only available in Gold mode
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
              
              <TradingHistory userId={user.id} mode={currentMode} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;