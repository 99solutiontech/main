import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, DollarSign, TrendingUp, LogOut, User as UserIcon } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  trader_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface UserStats {
  user_id: string;
  trader_name: string;
  diamond_capital: number;
  gold_capital: number;
  total_trades: number;
  last_active: string;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
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
      
      if (data?.role !== 'super_admin') {
        navigate('/');
        return;
      }
      
      await Promise.all([loadAllUsers(), loadUserStats()]);
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

  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // Get fund data for all users
      const { data: fundData, error: fundError } = await supabase
        .from('fund_data')
        .select('user_id, mode, total_capital');

      if (fundError) throw fundError;

      // Get trading history count for all users
      const { data: historyData, error: historyError } = await supabase
        .from('trading_history')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Combine data by user
      const statsMap = new Map<string, UserStats>();
      
      // Initialize with profiles
      users.forEach(user => {
        statsMap.set(user.user_id, {
          user_id: user.user_id,
          trader_name: user.trader_name,
          diamond_capital: 0,
          gold_capital: 0,
          total_trades: 0,
          last_active: user.created_at,
        });
      });

      // Add fund data
      fundData?.forEach(fund => {
        const stats = statsMap.get(fund.user_id);
        if (stats) {
          if (fund.mode === 'diamond') {
            stats.diamond_capital = fund.total_capital;
          } else {
            stats.gold_capital = fund.total_capital;
          }
        }
      });

      // Add trading history
      const tradeCountMap = new Map<string, number>();
      const lastActiveMap = new Map<string, string>();
      
      historyData?.forEach(trade => {
        tradeCountMap.set(trade.user_id, (tradeCountMap.get(trade.user_id) || 0) + 1);
        if (!lastActiveMap.has(trade.user_id)) {
          lastActiveMap.set(trade.user_id, trade.created_at);
        }
      });

      // Update stats with counts and last active
      statsMap.forEach((stats, userId) => {
        stats.total_trades = tradeCountMap.get(userId) || 0;
        stats.last_active = lastActiveMap.get(userId) || stats.last_active;
      });

      setUserStats(Array.from(statsMap.values()));
    } catch (error: any) {
      console.error('Error loading user stats:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadAllUsers();
      toast({
        title: "Success",
        description: `User ${!currentStatus ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadAllUsers();
      toast({
        title: "Success",
        description: "User role updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
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

  if (!profile || profile.role !== 'super_admin') {
    return null;
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const totalCapital = userStats.reduce((sum, stat) => sum + stat.diamond_capital + stat.gold_capital, 0);
  const totalTrades = userStats.reduce((sum, stat) => sum + stat.total_trades, 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Shield className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">
                  Manage Moneyx users and monitor system
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => navigate('/')}>
                <UserIcon className="h-4 w-4 mr-2" />
                User Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {activeUsers} active users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Capital</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalCapital.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Across all users
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTrades}</div>
              <p className="text-xs text-muted-foreground">
                All time trades
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                User activity rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Management Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage user accounts, roles, and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trader Name</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diamond Capital</TableHead>
                  <TableHead>Gold Capital</TableHead>
                  <TableHead>Total Trades</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const stats = userStats.find(s => s.user_id === user.user_id);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.trader_name}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.is_active ? 'default' : 'secondary'}>
                          {user.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>${(stats?.diamond_capital || 0).toLocaleString()}</TableCell>
                      <TableCell>${(stats?.gold_capital || 0).toLocaleString()}</TableCell>
                      <TableCell>{stats?.total_trades || 0}</TableCell>
                      <TableCell>
                        {new Date(stats?.last_active || user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                            disabled={user.role === 'super_admin'}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.user_id, e.target.value)}
                            disabled={user.role === 'super_admin'}
                            className="px-2 py-1 border rounded text-sm"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Admin;