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
      // Delete ALL data for this user and mode (including sub-accounts)
      
      // 1. Delete all trading history for current mode (main + sub accounts)
      await supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode);

      // 2. Delete all transaction history for current mode (main + sub accounts)
      await supabase
        .from('transaction_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode);

      // 3. Delete ALL fund data for current mode (main + sub accounts)
      await supabase
        .from('fund_data')
        .delete()
        .eq('user_id', userId)
        .eq('mode', currentMode);

      toast({
        title: t('success'),
        description: `All ${currentMode} mode data has been completely reset. Please set up initial fund again.`,
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
            This will completely erase ALL data for {currentMode} mode including trading history, transaction history, and fund setup. You will need to set up initial fund again. This action cannot be undone.
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