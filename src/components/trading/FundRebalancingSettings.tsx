import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  sub_user_name?: string;
}

interface FundRebalancingSettingsProps {
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
}

interface RebalancingForm {
  target_active_amount: number;
  rebalance_from: 'reserve' | 'profit';
}

const FundRebalancingSettings = ({ fundData, subUserName, onUpdate }: FundRebalancingSettingsProps) => {
  const { t } = useLanguage();
  const { format, fromDisplay } = useCurrency();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RebalancingForm>({
    defaultValues: {
      target_active_amount: fundData.active_fund,
      rebalance_from: 'reserve'
    }
  });

  const targetAmount = watch('target_active_amount');
  const rebalanceFrom = watch('rebalance_from');
  const currentActive = fundData.active_fund;
  const difference = targetAmount - currentActive;
  const availableReserve = fundData.reserve_fund;
  const availableProfit = fundData.profit_fund;

  const canRebalance = difference !== 0 && (
    (difference > 0 && rebalanceFrom === 'reserve' && difference <= availableReserve) ||
    (difference > 0 && rebalanceFrom === 'profit' && difference <= availableProfit) ||
    (difference < 0)
  );

  const updateFundBalances = async (data: RebalancingForm) => {
    if (!canRebalance) return;

    setIsLoading(true);
    try {
      const actualTargetAmount = fromDisplay(data.target_active_amount);
      const actualDifference = actualTargetAmount - fundData.active_fund;
      
      let newActiveFund = fundData.active_fund + actualDifference;
      let newReserveFund = fundData.reserve_fund;
      let newProfitFund = fundData.profit_fund;

      if (actualDifference > 0) {
        // Adding to active fund
        if (data.rebalance_from === 'reserve') {
          newReserveFund -= actualDifference;
        } else {
          newProfitFund -= actualDifference;
        }
      } else {
        // Reducing active fund - always goes to reserve
        newReserveFund -= actualDifference; // actualDifference is negative
      }

      const { error } = await supabase
        .from('fund_data')
        .update({
          active_fund: newActiveFund,
          reserve_fund: newReserveFund,
          profit_fund: newProfitFund,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', fundData.user_id)
        .eq('mode', fundData.mode)
        .eq('sub_user_name', subUserName || null);

      if (error) throw error;

      // Record transaction
      const transactionType = actualDifference > 0 ? 'fund_rebalance_in' : 'fund_rebalance_out';
      const fromFund = actualDifference > 0 ? data.rebalance_from : 'active';
      const toFund = actualDifference > 0 ? 'active' : 'reserve';

      await supabase
        .from('transaction_history')
        .insert({
          user_id: fundData.user_id,
          mode: fundData.mode,
          sub_user_name: subUserName,
          transaction_type: transactionType,
          amount: Math.abs(actualDifference),
          description: `Fund rebalancing: ${fromFund} → ${toFund}`,
          created_at: new Date().toISOString()
        });

      toast.success(t('fundRebalanceSuccess'));
      setOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error rebalancing funds:', error);
      toast.error(t('fundRebalanceError'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('fundRebalancingSettings')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(updateFundBalances)} className="space-y-4">
          <div>
            <Label htmlFor="target_active_amount">{t('targetActiveAmount')}</Label>
            <Input
              id="target_active_amount"
              type="number"
              step="0.01"
              {...register('target_active_amount', { 
                required: true,
                min: 0
              })}
            />
            <div className="text-sm text-muted-foreground mt-1">
              {t('currentActive')}: {format(currentActive)}
            </div>
          </div>

          {difference !== 0 && (
            <>
              <div>
                <Label>{difference > 0 ? t('transferFrom') : t('excessWillGoTo')}</Label>
                {difference > 0 ? (
                  <div className="space-y-2 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="reserve"
                        {...register('rebalance_from')}
                        className="form-radio"
                      />
                      <span>{t('reserveFund')} ({format(availableReserve)} {t('available')})</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="profit"
                        {...register('rebalance_from')}
                        className="form-radio"
                      />
                      <span>{t('profitFund')} ({format(availableProfit)} {t('available')})</span>
                    </label>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1">
                    {format(Math.abs(difference))} {t('willBeMovedToReserve')}
                  </div>
                )}
              </div>

              <div className="bg-muted p-3 rounded">
                <div className="text-sm">
                  <div className="font-medium mb-1">{t('rebalanceSummary')}:</div>
                  <div>{t('difference')}: {difference > 0 ? '+' : ''}{format(difference)}</div>
                  {!canRebalance && difference > 0 && (
                    <div className="text-red-500 text-xs mt-1">
                      {t('insufficientFunds')}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={!canRebalance || isLoading || difference === 0}
            >
              {isLoading ? t('updating') : t('rebalanceFunds')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default FundRebalancingSettings;