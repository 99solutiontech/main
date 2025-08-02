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
    if (!userId || !fundData) return;
    
    try {
      // Delete all trading history for current mode and main account
      await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null);

      // Delete all fund transactions for current mode and main account
      await supabase
        .from('fund_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .is('sub_user_name', null);

      // Reset fund data to initial capital for current mode and main account
      const initialCapital = fundData.initial_capital;
      const activeAmount = initialCapital * 0.4;
      const reserveAmount = initialCapital * 0.6;
      
      await supabase
        .from('fund_data')
        .update({
          total_capital: initialCapital,
          active_fund: activeAmount,
          reserve_fund: reserveAmount,
          profit_fund: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundData.id);

      // Add reset entry to trading history
      await supabase.from('trading_history').insert({
        user_id: userId,
        mode: currentMode,
        type: 'Initialize',
        details: `Data reset - Initial capital restored to $${initialCapital.toLocaleString()}`,
        end_balance: initialCapital,
      });

      toast({
        title: t('success'),
        description: t('allDataHasBeenReset'),
      });

      // Trigger refresh of transaction history and components
      window.dispatchEvent(new Event('refreshTransactions'));
      window.dispatchEvent(new Event('refreshFundData'));
      
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
            {t('resetDataWarning')}
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