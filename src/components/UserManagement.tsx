import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UserManagementProps {
  userId: string;
  currentMode: 'diamond' | 'gold';
  fundData?: any;
  onReset?: () => void;
}

const UserManagement = ({ userId, currentMode, fundData, onReset }: UserManagementProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleResetAllData = async () => {
    if (!userId) return;
    
    try {
      // Reset ONLY the main account (sub_user_name is NULL) for the current mode
      // 1. Delete trading history for main account in this mode
      await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null);

      // 2. Delete transaction history for main account in this mode
      await supabase
        .from('transaction_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null);

      // 3. Reset balances in fund_data but KEEP the main account record
      const { error: updateError } = await supabase
        .from('fund_data')
        .update({
          initial_capital: 0,
          total_capital: 0,
          active_fund: 0,
          reserve_fund: 0,
          profit_fund: 0,
          target_reserve_fund: 0,
        })
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null);

      if (updateError) throw updateError;

      toast({
        title: t('success'),
        description: `Main account in ${currentMode} mode has been reset. Balances cleared, account kept.`,
      });

      // Trigger refresh of all components
      window.dispatchEvent(new Event('refreshTransactions'));
      window.dispatchEvent(new Event('refreshFundData'));
      window.dispatchEvent(new Event('resetComplete'));
      
      onReset?.();
    } catch (error) {
      console.error('Reset error:', error);
      toast({
        title: t('error'),
        description: t('failedToResetData'),
        variant: 'destructive',
      });
    }
  };

  return (
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
            This will clear all data for the MAIN account in {currentMode} mode (trading history, transaction history) and set all balances to 0. The account will be kept. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleResetAllData}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('resetData')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UserManagement;