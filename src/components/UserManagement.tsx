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
      // Delete all trading history for this user and mode (including sub users)
      const { error: historyError } = await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode);

      if (historyError) throw historyError;

      // Delete all fund transactions for this user and mode (including sub users)
      const { error: transactionError } = await supabase
        .from('fund_transactions')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode);

      if (transactionError) throw transactionError;

      // Delete fund data instead of resetting to 0 (including sub users)
      const { error: fundError } = await supabase
        .from('fund_data')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode);

      if (fundError) throw fundError;

      toast({
        title: t('dataResetSuccess'),
        description: t('allDataHasBeenReset'),
      });

      // Trigger refresh of transaction history and components
      window.dispatchEvent(new Event('refreshTransactions'));
      window.dispatchEvent(new Event('refreshFundData'));
      
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