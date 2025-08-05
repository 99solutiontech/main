import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Users, DollarSign, TrendingUp, LogOut, User as UserIcon, Search, Filter, Bell, AlertTriangle, CheckCircle, XCircle, Clock, Settings, Edit, Trash2, ChevronDown } from 'lucide-react';
import { User, Session } from '@supabase/supabase-js';
import { UserRegistrationPieChart } from '@/components/admin/UserRegistrationPieChart';
import { MonthlyFundChart } from '@/components/admin/MonthlyFundChart';
import { MonthlyTradesChart } from '@/components/admin/MonthlyTradesChart';

interface Profile {
  id: string;
  user_id: string;
  full_name?: string;
  trader_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  registration_status?: string;
  last_login?: string;
  failed_login_attempts?: number;
}

interface UserStats {
  user_id: string;
  trader_name: string;
  diamond_capital: number;
  gold_capital: number;
  total_trades: number;
  last_active: string;
}

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  user_id?: string;
  is_read: boolean;
  created_at: string;
}

interface UserSession {
  id: string;
  user_id: string;
  trader_name: string;
  ip_address: string;
  device_info: string;
  last_activity: string;
  is_active: boolean;
}

const Admin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userStats, setUserStats] = useState<UserStats[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [pendingUsers, setPendingUsers] = useState<Profile[]>([]);
  const [rejectedUsers, setRejectedUsers] = useState<Profile[]>([]);
  const [activeSessions, setActiveSessions] = useState<UserSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
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
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data as any);
      
      if ((data as any)?.role !== 'super_admin') {
        navigate('/');
        return;
      }
      
      await Promise.all([
        loadAllUsers(), 
        loadUserStats(), 
        loadNotifications(), 
        loadPendingUsers(),
        loadRejectedUsers(), 
        loadActiveSessions()
      ]);
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
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers((data as any) || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    }
  };

  const loadUserStats = async () => {
    try {
      // Get all users first
      const { data: allUsers, error: usersError } = await supabase
        .from('profiles')
        .select('user_id, trader_name, created_at');

      if (usersError) throw usersError;

      // Get fund data for all users - sum total capital by user across both modes
      const { data: fundData, error: fundError } = await supabase
        .from('fund_data')
        .select('user_id, mode, total_capital, active_fund, reserve_fund, profit_fund');

      if (fundError) throw fundError;

      // Get trading history count for all users
      const { data: historyData, error: historyError } = await supabase
        .from('trading_history')
        .select('user_id, created_at')
        .order('created_at', { ascending: false });

      if (historyError) throw historyError;

      // Combine data by user
      const statsMap = new Map<string, UserStats>();
      
      // Initialize with all users
      allUsers?.forEach(user => {
        statsMap.set(user.user_id, {
          user_id: user.user_id,
          trader_name: user.trader_name,
          diamond_capital: 0,
          gold_capital: 0,
          total_trades: 0,
          last_active: user.created_at,
        });
      });

      // Add fund data - aggregate by user
      fundData?.forEach((fund: any) => {
        const stats = statsMap.get(fund.user_id);
        if (stats) {
          if (fund.mode === 'diamond') {
            stats.diamond_capital += fund.total_capital || 0;
          } else if (fund.mode === 'gold') {
            stats.gold_capital += fund.total_capital || 0;
          }
        }
      });

      // Add trading history count and last activity
      const tradeCountMap = new Map<string, number>();
      const lastActiveMap = new Map<string, string>();
      
      historyData?.forEach((trade: any) => {
        tradeCountMap.set(trade.user_id, (tradeCountMap.get(trade.user_id) || 0) + 1);
        if (!lastActiveMap.has(trade.user_id)) {
          lastActiveMap.set(trade.user_id, trade.created_at);
        }
      });

      // Update stats with counts and last active
      statsMap.forEach((stats, userId) => {
        stats.total_trades = tradeCountMap.get(userId) || 0;
        const lastTradeActivity = lastActiveMap.get(userId);
        if (lastTradeActivity) {
          stats.last_active = lastTradeActivity;
        }
      });

      setUserStats(Array.from(statsMap.values()));
    } catch (error: any) {
      console.error('Error loading user stats:', error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
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
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;
      
      await loadAllUsers();
      
      // Log admin action (this will work after migration approval)
      try {
        await (supabase as any)
          .from('admin_actions')
          .insert({
            admin_id: user?.id,
            action_type: 'role_change',
            target_user_id: userId,
            details: `Role changed to ${newRole}`,
          });
      } catch (actionError) {
        console.log('Admin action logging not available yet');
      }

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

  const loadNotifications = async () => {
    try {
      // This will work after migration approval
      const { data, error } = await (supabase as any)
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data);
      }
    } catch (error) {
      console.log('Notifications not available yet - will be enabled after migration');
    }
  };

  const loadPendingUsers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('registration_status', 'pending')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setPendingUsers(data);
      }
    } catch (error) {
      console.log('Registration status not available yet - will be enabled after migration');
    }
  };

  const loadRejectedUsers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('registration_status', 'rejected')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setRejectedUsers(data);
      }
    } catch (error) {
      console.log('Registration status not available yet - will be enabled after migration');
    }
  };

  const loadActiveSessions = async () => {
    try {
      // This will work after migration approval
      const { data, error } = await (supabase as any)
        .from('user_sessions')
        .select('*, profiles(trader_name)')
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (!error && data) {
        setActiveSessions(data.map((session: any) => ({
          ...session,
          trader_name: session.profiles?.trader_name || 'Unknown'
        })));
      } else {
        // Always set empty array if there's an error
        setActiveSessions([]);
      }
    } catch (error) {
      console.log('User sessions not available yet - will be enabled after migration');
      // Set empty array to prevent loading issues
      setActiveSessions([]);
    }
  };

  const approveUser = async (userId: string) => {
    try {
      // First, update the user's email confirmation status using our edge function
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      // Call edge function to confirm email and approve user
      const response = await fetch(`https://fnnoxdrkslfuuuuyltsr.supabase.co/functions/v1/approve-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubm94ZHJrc2xmdXV1dXlsdHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzk0MjEsImV4cCI6MjA2OTYxNTQyMX0.fp7qbkoU9PTwm227-u9tQbVhEIsldE9vPgb_NHJUpis',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve user');
      }

      // Update profile status
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          registration_status: 'approved',
          is_active: true 
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      // Mark notification as read
      try {
        await (supabase as any)
          .from('admin_notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('type', 'registration');
      } catch (notificationError) {
        console.log('Notification update not available yet');
      }

      await Promise.all([loadPendingUsers(), loadRejectedUsers(), loadAllUsers(), loadNotifications()]);
      
      toast({
        title: "Success",
        description: "User approved successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rejectUser = async (userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          registration_status: 'rejected',
          is_active: false 
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      // Create notification (will work after migration)
      try {
        await (supabase as any)
          .from('admin_notifications')
          .update({ is_read: true })
          .eq('user_id', userId)
          .eq('type', 'registration');
      } catch (notificationError) {
        console.log('Notification update not available yet');
      }

      await Promise.all([loadPendingUsers(), loadRejectedUsers(), loadAllUsers(), loadNotifications()]);
      
      toast({
        title: "Success", 
        description: "User rejected successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    console.log('Marking notification as read:', notificationId);
    
    const { error } = await supabase
      .from('admin_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    } else {
      console.log('Notification marked as read successfully');
      toast({
        title: "Success",
        description: "Notification marked as read",
      });
    }
  };

  const handleNotificationClick = (notificationId: string) => {
    // Update local state immediately for instant UI response
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, is_read: true }
          : notif
      )
    );
    markNotificationRead(notificationId);
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await (supabase as any)
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);
      
      await loadActiveSessions();
      
      toast({
        title: "Success",
        description: "Session terminated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error", 
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const reApproveUser = async (userId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ 
          registration_status: 'pending',
          is_active: false 
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      await Promise.all([loadPendingUsers(), loadRejectedUsers(), loadAllUsers()]);
      
      toast({
        title: "Success",
        description: "User moved back to pending approval",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Call our edge function to delete the user with proper permissions
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session');
      }

      const response = await fetch(`https://fnnoxdrkslfuuuuyltsr.supabase.co/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZubm94ZHJrc2xmdXV1dXlsdHNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwMzk0MjEsImV4cCI6MjA2OTYxNTQyMX0.fp7qbkoU9PTwm227-u9tQbVhEIsldE9vPgb_NHJUpis',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      await loadAllUsers();
      
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const approveFromNotification = async (userId: string, notificationId: string) => {
    // Set notification as processed immediately to hide buttons
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, processed: true, action: 'approved' }
          : notification
      )
    );
    
    await approveUser(userId);
    await markNotificationRead(notificationId);
    setNotificationDropdownOpen(false);
  };

  const rejectFromNotification = async (userId: string, notificationId: string) => {
    // Set notification as processed immediately to hide buttons
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, processed: true, action: 'rejected' }
          : notification
      )
    );
    
    await rejectUser(userId);
    await markNotificationRead(notificationId);
    setNotificationDropdownOpen(false);
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
  const unreadNotifications = notifications.filter(n => !n.is_read).length;

  // Filter users based on search and filters - include all status users in main list
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.trader_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active && user.registration_status !== 'pending') ||
                         (statusFilter === 'inactive' && !user.is_active) ||
                         (statusFilter === 'pending' && user.registration_status === 'pending');
    
    return matchesSearch && matchesRole && matchesStatus;
  });

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
              <DropdownMenu open={notificationDropdownOpen} onOpenChange={setNotificationDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative p-2">
                    <Bell className="h-5 w-5 text-primary" />
                    {unreadNotifications > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {unreadNotifications}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No notifications
                    </div>
                  ) : (
                    notifications.slice(0, 5).map((notification) => (
                      <div 
                        key={notification.id} 
                        className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                          !notification.is_read ? 'bg-primary/5 border-l-4 border-l-primary' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {notification.type === 'registration' && <UserIcon className="h-3 w-3 text-blue-500" />}
                              {notification.type === 'security' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                              <span className={`text-sm ${!notification.is_read ? 'font-bold' : 'font-medium'}`}>
                                {notification.title}
                              </span>
                              {!notification.is_read && <div className="h-2 w-2 bg-primary rounded-full animate-pulse"></div>}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{notification.message}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-muted-foreground">
                                {new Date(notification.created_at).toLocaleString()}
                              </p>
                              {(notification as any).processed && (
                                <span className={`text-xs px-2 py-1 rounded ${
                                  (notification as any).action === 'approved' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {(notification as any).action === 'approved' ? 'Approved' : 'Rejected'}
                                </span>
                              )}
                            </div>
                            {notification.type === 'registration' && notification.user_id && !(notification as any).processed && (
                              <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => approveFromNotification(notification.user_id!, notification.id)}
                                  className="text-xs h-6 px-2 text-green-600 hover:text-green-700"
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rejectFromNotification(notification.user_id!, notification.id)}
                                  className="text-xs h-6 px-2 text-red-600 hover:text-red-700"
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
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
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
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
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingUsers.length}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <UserRegistrationPieChart users={users} userStats={userStats} />
          <MonthlyFundChart />
        </div>
        
        <div className="mb-8">
          <MonthlyTradesChart />
        </div>

        {/* Main Admin Tabs */}
        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="registrations">
              Registration Queue {pendingUsers.length > 0 && <Badge className="ml-1">{pendingUsers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected Users {rejectedUsers.length > 0 && <Badge className="ml-1">{rejectedUsers.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications {unreadNotifications > 0 && <Badge className="ml-1">{unreadNotifications}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            {/* Search and Filter Controls */}
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage user accounts, roles, and permissions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40 bg-green-600 text-white border-green-700 hover:bg-green-700">
                      <SelectValue className="text-white placeholder:text-green-100" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="all" className="text-foreground">All Roles</SelectItem>
                      <SelectItem value="user" className="text-foreground">User</SelectItem>
                      <SelectItem value="admin" className="text-foreground">Admin</SelectItem>
                      <SelectItem value="super_admin" className="text-foreground">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue className="text-foreground" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-50">
                      <SelectItem value="all" className="text-foreground">All Status</SelectItem>
                      <SelectItem value="active" className="text-foreground">Active</SelectItem>
                      <SelectItem value="inactive" className="text-foreground">Inactive</SelectItem>
                      <SelectItem value="pending" className="text-foreground">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* User Table */}
            <Card>
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
                {filteredUsers.map((user) => {
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
                        <div className="flex flex-col gap-1">
                          <Badge variant={user.is_active ? 'default' : 'secondary'}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {user.registration_status && (
                            <Badge variant={user.registration_status === 'pending' ? 'outline' : user.registration_status === 'rejected' ? 'destructive' : 'default'}>
                              {user.registration_status}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>${(stats?.diamond_capital || 0).toLocaleString()}</TableCell>
                      <TableCell>${(stats?.gold_capital || 0).toLocaleString()}</TableCell>
                      <TableCell>{stats?.total_trades || 0}</TableCell>
                      <TableCell>
                        {new Date(stats?.last_active || user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {user.registration_status === 'pending' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => approveUser(user.user_id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => rejectUser(user.user_id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {user.registration_status !== 'pending' && (
                            <>
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
                            </>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Profile
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete User
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the user account and all associated data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteUser(user.user_id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="registrations" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Registration Queue</CardTitle>
            <CardDescription>
              Review and approve pending user registrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending registrations</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.trader_name}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          Pending Approval
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveUser(user.user_id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => rejectUser(user.user_id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="rejected" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Rejected Users</CardTitle>
            <CardDescription>
              Users who have been rejected and can be re-approved
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rejectedUsers.length === 0 ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No rejected users</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trader Name</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Registration Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.trader_name}</TableCell>
                      <TableCell>{user.full_name || '-'}</TableCell>
                      <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">
                          Rejected
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => reApproveUser(user.user_id)}
                          className="text-green-600 hover:text-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Re-approve
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>


      <TabsContent value="notifications" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Notifications</CardTitle>
            <CardDescription>
              System alerts and security notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No notifications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      notification.is_read ? 'bg-muted/50' : 'bg-card border-primary/20'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {notification.type === 'security' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                          {notification.type === 'registration' && <UserIcon className="h-4 w-4 text-blue-500" />}
                          {notification.type === 'system' && <Shield className="h-4 w-4 text-green-500" />}
                          <h4 className="font-semibold">{notification.title}</h4>
                          {!notification.is_read && <Badge variant="default" className="text-xs">New</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Show action buttons only if not processed and not read */}
                        {!notification.is_read && !(notification as any).processed && (
                          <>
                            {notification.type === 'registration' && notification.user_id && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => approveFromNotification(notification.user_id!, notification.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => rejectFromNotification(notification.user_id!, notification.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              Mark as read
                            </Button>
                          </>
                        )}
                        
                        {/* Show status if processed */}
                        {(notification as any).processed && (
                          <Badge variant={(notification as any).action === 'approved' ? 'default' : 'destructive'}>
                            {(notification as any).action === 'approved' ? 'Approved' : 'Rejected'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
      </main>
    </div>
  );
};

export default Admin;