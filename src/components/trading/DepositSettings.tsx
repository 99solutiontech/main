import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings } from 'lucide-react';

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

interface DepositSettingsProps {
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
  onClose?: () => void;
}

interface SettingsForm {
  activePercentage: number;
  reservePercentage: number;
}

const DepositSettings = ({ fundData, subUserName, onUpdate, onClose }: DepositSettingsProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  // Calculate current percentages based on active and reserve fund distribution
  const currentActivePercentage = 40; // Default from current logic
  const currentReservePercentage = 60; // Default from current logic

  const form = useForm<SettingsForm>({
    defaultValues: {
      activePercentage: currentActivePercentage,
      reservePercentage: currentReservePercentage,
    }
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleUpdateSettings = async (data: SettingsForm) => {
    const total = Number(data.activePercentage) + Number(data.reservePercentage);
    if (Math.abs(total - 100) > 0.01) {
      toast({
        title: "Error",
        description: "Active and Reserve percentages must add up to 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const newActivePercentage = data.activePercentage / 100;
      const newReservePercentage = data.reservePercentage / 100;
      
      // Calculate the target amounts based on total capital (excluding profit fund)
      const availableCapital = fundData.active_fund + fundData.reserve_fund;
      const targetActiveFund = availableCapital * newActivePercentage;
      const targetReserveFund = availableCapital * newReservePercentage;
      
      // Calculate the difference and determine transfer direction
      const activeDifference = targetActiveFund - fundData.active_fund;
      const reserveDifference = targetReserveFund - fundData.reserve_fund;
      
      let transferAmount = 0;
      let transferFrom = '';
      let transferTo = '';
      let transferDescription = '';

      if (activeDifference > 0) {
        // Need to move money TO active fund FROM reserve fund
        transferAmount = activeDifference;
        transferFrom = 'reserve';
        transferTo = 'active';
        transferDescription = `Rebalanced funds: moved ${formatCurrency(transferAmount)} from reserve to active (${data.reservePercentage}% → ${data.activePercentage}%)`;
      } else if (activeDifference < 0) {
        // Need to move money TO reserve fund FROM active fund
        transferAmount = Math.abs(activeDifference);
        transferFrom = 'active';
        transferTo = 'reserve';
        transferDescription = `Rebalanced funds: moved ${formatCurrency(transferAmount)} from active to reserve (${data.activePercentage}% → ${data.reservePercentage}%)`;
      }

      if (transferAmount > 0) {
        // Update fund data
        const updatedFundData = {
          active_fund: targetActiveFund,
          reserve_fund: targetReserveFund,
          target_reserve_fund: targetReserveFund,
        };

        const { error: fundError } = await supabase
          .from('fund_data')
          .update(updatedFundData)
          .eq('id', fundData.id);

        if (fundError) throw fundError;

        // Record the transaction
        const { error: historyError } = await supabase.from('transaction_history').insert({
          user_id: fundData.user_id,
          mode: fundData.mode,
          transaction_type: 'transfer',
          from_fund: transferFrom,
          to_fund: transferTo,
          amount: transferAmount,
          balance_before: fundData.total_capital,
          balance_after: fundData.total_capital, // Total doesn't change in rebalancing
          description: transferDescription,
          sub_user_name: subUserName,
        });

        if (historyError) throw historyError;

        toast({
          title: "Success",
          description: "Fund allocation settings updated successfully",
        });

        // Trigger refresh of transaction history
        window.dispatchEvent(new Event('refreshTransactions'));
      }

      setOpen(false);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
          <span className="sr-only">Deposit Settings</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('depositAllocationSettings')}</DialogTitle>
          <DialogDescription>
            {t('adjustHowDepositsAreSplit')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleUpdateSettings)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activePercentage">{t('activeFundPercent')}</Label>
              <Input
                id="activePercentage"
                type="number"
                min="0"
                max="100"
                step="1"
                {...form.register('activePercentage', { 
                  required: true, 
                  min: 0, 
                  max: 100,
                  onChange: (e) => {
                    const activeValue = parseInt(e.target.value) || 0;
                    form.setValue('reservePercentage', 100 - activeValue);
                  }
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservePercentage">{t('reserveFundPercent')}</Label>
              <Input
                id="reservePercentage"
                type="number"
                min="0"
                max="100"
                step="1"
                {...form.register('reservePercentage', { 
                  required: true, 
                  min: 0, 
                  max: 100,
                  onChange: (e) => {
                    const reserveValue = parseInt(e.target.value) || 0;
                    form.setValue('activePercentage', 100 - reserveValue);
                  }
                })}
              />
            </div>
          </div>
          
          <div className="bg-muted p-3 rounded-lg">
            <h4 className="font-medium mb-2">{t('currentFundDistribution')}</h4>
            <div className="text-sm space-y-1">
              <div>{t('activeFund')}: {formatCurrency(fundData.active_fund)}</div>
              <div>{t('reserveFund')}: {formatCurrency(fundData.reserve_fund)}</div>
              <div className="text-muted-foreground">
                {t('totalAvailable')}: {formatCurrency(fundData.active_fund + fundData.reserve_fund)}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('updating') : t('updateSettings')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default DepositSettings;