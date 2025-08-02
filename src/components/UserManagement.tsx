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
  mode: 'diamond' | 'gold';
  onReset?: () => void;
}

const UserManagement = ({ userId, mode, onReset }: UserManagementProps) => {
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleResetAllData = async () => {
    try {
      // Delete all trading history for this user and mode
      const { error: historyError } = await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode)
        .is('sub_user_name', null);

      if (historyError) throw historyError;

      // Delete all fund transactions for this user and mode
      const { error: transactionError } = await supabase
        .from('fund_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode)
        .is('sub_user_name', null);

      if (transactionError) throw transactionError;

      // Reset fund data to default values
      const { error: fundError } = await supabase
        .from('fund_data')
        .upsert({
          user_id: userId,
          mode: mode,
          sub_user_name: null,
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
        description: t('allDataHasBeenReset'),
      });

      onReset?.();
    } catch (error) {
      console.error('Error resetting data:', error);
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