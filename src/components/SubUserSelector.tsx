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

  const handleSubUserChange = (value: string) => {
    if (value === 'main') {
      onSubUserChange(null);
    } else {
      onSubUserChange(value);
    }
  };

  const handleResetSubUser = async (subUserName: string) => {
    try {
      // Delete all trading history for this sub-user
      const { error: historyError } = await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .eq('sub_user_name', subUserName);

      if (historyError) throw historyError;

      // Delete all fund transactions for this sub-user
      const { error: transactionError } = await supabase
        .from('fund_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .eq('sub_user_name', subUserName);

      if (transactionError) throw transactionError;

      // Reset fund data to default values for sub-user
      const { error: fundError } = await supabase
        .from('fund_data')
        .upsert({
          user_id: userId,
          mode: currentMode,
          sub_user_name: subUserName,
          initial_capital: 0,
          total_capital: 0,
          active_fund: 0,
          reserve_fund: 0,
          profit_fund: 0,
          target_reserve_fund: 0,
          profit_dist_active: 50,
          profit_dist_reserve: 25,
          profit_dist_profit: 25,
          lot_base_capital: 1000,
          lot_base_lot: 0.4,
        }, {
          onConflict: 'user_id,mode,sub_user_name'
        });

      if (fundError) throw fundError;

      toast({
        title: t('dataResetSuccess'),
        description: t('subUserDataReset').replace('{name}', subUserName),
      });

      loadSubUsers();
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
              {t('mainAccount')} ({formatCurrency(subUsers.find(u => u.name === null)?.totalCapital || 0)})
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
            mode={currentMode}
            onReset={loadSubUsers}
          />
        )}
        
        {/* Sub-user reset button */}
        {selectedSubUser && selectedSubUser !== 'main' && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">{t('resetData')}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  {t('resetDataConfirm')}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t('resetSubUserWarning').replace('{name}', selectedSubUser)}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => handleResetSubUser(selectedSubUser)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t('resetData')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
              <Settings className="h-4 w-4" />
              <span className="sr-only">{t('manageSubAccounts')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <SubUserManager 
              userId={userId} 
              onSubUserSelect={() => {}}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default SubUserSelector;