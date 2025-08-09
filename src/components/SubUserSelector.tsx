import { useState, useEffect } from 'react';
import { Settings, RotateCcw, AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import SubUserManager from '@/components/trading/SubUserManager';
import UserManagement from '@/components/UserManagement';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

interface SubUser {
  id: string;
  name: string | null;
  totalCapital: number;
  funds: {
    active: number;
    reserve: number;
    profit: number;
  };
}

interface SubUserSelectorProps {
  userId: string;
  currentMode: 'diamond' | 'gold';
  selectedSubUser: string | null;
  onSubUserChange: (subUser: string | null) => void;
}

const SubUserSelector = ({ userId, currentMode, selectedSubUser, onSubUserChange }: SubUserSelectorProps) => {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    loadSubUsers();
  }, [userId, currentMode]);

  const loadSubUsers = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', currentMode);

      if (error) throw error;

      const processedSubUsers = (data || []).map((fund: any) => ({
        id: fund.id,
        name: fund.sub_user_name,
        totalCapital: fund.total_capital || 0,
        funds: {
          active: fund.active_fund || 0,
          reserve: fund.reserve_fund || 0,
          profit: fund.profit_fund || 0,
        },
      }));

      setSubUsers(processedSubUsers);
    } catch (error) {
      console.error('Error loading sub users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) return;
    const channels: any[] = [];

    const fundChannel = supabase
      .channel('subuser_fund_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fund_data', filter: `user_id=eq.${userId}` },
        () => loadSubUsers()
      )
      .subscribe();
    channels.push(fundChannel);

    const txChannel = supabase
      .channel('subuser_tx_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_history', filter: `user_id=eq.${userId}` },
        () => loadSubUsers()
      )
      .subscribe();
    channels.push(txChannel);

    return () => { channels.forEach(ch => supabase.removeChannel(ch)); };
  }, [userId, currentMode]);

  const handleSubUserChange = (value: string) => {
    if (value === 'main') {
      onSubUserChange(null);
    } else {
      onSubUserChange(value);
    }
  };

  const handleResetSubUser = async (subUserName: string) => {
    try {
      // Get mode for proper deletion
      const { data: subUserData } = await supabase
        .from('fund_data')
        .select('mode')
        .eq('user_id', userId)
        .eq('sub_user_name', subUserName)
        .single();

      if (!subUserData) {
        throw new Error('Sub user not found');
      }

      // Delete ALL data for this sub-user
      
      // 1. Delete all trading history
      await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', subUserData.mode)
        .eq('sub_user_name', subUserName);

      // 2. Delete all transaction history
      await supabase
        .from('transaction_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', subUserData.mode)
        .eq('sub_user_name', subUserName);

      // 3. Delete fund data (complete wipe)
      await supabase
        .from('fund_data')
        .delete()
        .eq('user_id', userId)
        .eq('sub_user_name', subUserName);

      toast({
        title: t('success'),
        description: `Sub account "${subUserName}" has been completely reset and deleted.`,
      });

      // Trigger refresh
      window.dispatchEvent(new Event('refreshTransactions'));
      window.dispatchEvent(new Event('refreshFundData'));
      
      loadSubUsers();
      
      // If this was the selected sub user, switch back to main
      if (selectedSubUser === subUserName) {
        onSubUserChange(null);
      }
    } catch (error) {
      console.error('Error resetting sub-user data:', error);
      toast({
        title: t('error'),
        description: t('failedToResetData'),
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return <div className="animate-pulse h-8 bg-muted rounded"></div>;
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select value={selectedSubUser || 'main'} onValueChange={handleSubUserChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={t('selectAccount')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="main">
              Main Account ({formatCurrency(subUsers.find(u => u.name === null)?.totalCapital || 0)})
            </SelectItem>
            {subUsers.filter(user => user.name !== null).map((user) => (
              <SelectItem key={user.id} value={user.name!}>
                {user.name} ({formatCurrency(user.totalCapital)})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Main account reset button */}
        {(!selectedSubUser || selectedSubUser === 'main') && (
          <UserManagement 
            userId={userId} 
            currentMode={currentMode}
            onReset={loadSubUsers}
          />
        )}
        
        <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
              <span className="sr-only">Manage Sub Accounts</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <SubUserManager 
              userId={userId}
              currentMode={currentMode}
              selectedSubUser={null}
              onSubUserSelect={() => {}}
              selectedSubUserName={selectedSubUser}
              onResetSubUser={handleResetSubUser}
              onCreated={() => setIsManagerOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SubUserSelector;