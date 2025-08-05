import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

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

interface TradeRecorderProps {
  userId: string;
  mode: 'diamond' | 'gold';
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
}

interface DiamondForm {
  end_of_week_balance: number;
}

interface GoldForm {
  trade_date: string;
  end_balance: number;
}

const TradeRecorder = ({ userId, mode, fundData, subUserName, onUpdate }: TradeRecorderProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const diamondForm = useForm<DiamondForm>();
  const goldForm = useForm<GoldForm>({
    defaultValues: {
      trade_date: new Date().toISOString().split('T')[0]
    }
  });

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const recordDiamondTrade = async (data: DiamondForm) => {
    setLoading(true);
    try {
      const currentActiveFund = Number(fundData.active_fund);
      const newActiveFund = Number(data.end_of_week_balance);
      const pnl = newActiveFund - currentActiveFund;
      
      let updatedFundData = { 
        ...fundData,
        active_fund: Number(fundData.active_fund),
        reserve_fund: Number(fundData.reserve_fund),
        profit_fund: Number(fundData.profit_fund),
        total_capital: Number(fundData.total_capital),
        initial_capital: Number(fundData.initial_capital)
      };
      
      if (pnl > 0) {
        // Profit: distribute according to profit distribution settings
        const profitToActive = (pnl * (fundData.profit_dist_active ?? 50)) / 100;
        const profitToReserve = (pnl * (fundData.profit_dist_reserve ?? 25)) / 100;
        const profitToProfit = (pnl * (fundData.profit_dist_profit ?? 25)) / 100;
        
        // Distribute the profit
        updatedFundData.active_fund = currentActiveFund + profitToActive;
        updatedFundData.reserve_fund += profitToReserve;
        updatedFundData.profit_fund += profitToProfit;
      } else if (pnl < 0) {
        // Loss: Use reserve fund to backup the active fund loss
        const lossAmount = Math.abs(pnl);
        const activeFundAfterLoss = newActiveFund; // This is what user entered as new balance
        const actualLoss = currentActiveFund - activeFundAfterLoss; // Actual loss amount
        const transferFromReserve = Math.min(actualLoss, updatedFundData.reserve_fund);
        
        // Add the reserve transfer back to active fund to cover the loss
        updatedFundData.active_fund = activeFundAfterLoss + transferFromReserve;
        
        // Deduct the transfer amount from reserve fund
        updatedFundData.reserve_fund -= transferFromReserve;
        
        // The actual loss to total capital is only what reserve couldn't cover
        const uncoveredLoss = actualLoss - transferFromReserve;
      } else {
        // No profit/loss
        updatedFundData.active_fund = newActiveFund;
      }
      
      // Calculate new total capital (should always equal active + reserve + profit)
      updatedFundData.total_capital = updatedFundData.active_fund + updatedFundData.reserve_fund + updatedFundData.profit_fund;

      // Update fund data
      const { error: fundError } = await (supabase as any)
        .from('fund_data')
        .update({
          total_capital: updatedFundData.total_capital,
          active_fund: updatedFundData.active_fund,
          reserve_fund: updatedFundData.reserve_fund,
          profit_fund: updatedFundData.profit_fund,
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      // Add history record
      const { error: historyError } = await (supabase as any)
        .from('trading_history')
        .insert({
          user_id: userId,
          mode: mode,
          type: pnl >= 0 ? 'Win' : 'Loss',
          details: `Weekly trading result: ${formatCurrency(pnl)}`,
          amount: pnl,
          end_balance: updatedFundData.total_capital,
          sub_user_name: subUserName,
        });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: "Trade recorded successfully",
      });

      diamondForm.reset();
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

  const recordGoldTrade = async (data: GoldForm) => {
    setLoading(true);
    try {
      const currentActiveFund = Number(fundData.active_fund);
      const newActiveFund = Number(data.end_balance);
      const pnl = newActiveFund - currentActiveFund;
      
      let updatedFundData = { 
        ...fundData,
        active_fund: Number(fundData.active_fund),
        reserve_fund: Number(fundData.reserve_fund),
        profit_fund: Number(fundData.profit_fund),
        total_capital: Number(fundData.total_capital),
        initial_capital: Number(fundData.initial_capital)
      };
      
      if (pnl > 0) {
        // Profit: distribute according to profit distribution settings
        const profitToActive = (pnl * (fundData.profit_dist_active ?? 50)) / 100;
        const profitToReserve = (pnl * (fundData.profit_dist_reserve ?? 25)) / 100;
        const profitToProfit = (pnl * (fundData.profit_dist_profit ?? 25)) / 100;
        
        // Distribute the profit
        updatedFundData.active_fund = currentActiveFund + profitToActive;
        updatedFundData.reserve_fund += profitToReserve;
        updatedFundData.profit_fund += profitToProfit;
      } else if (pnl < 0) {
        // Loss: Use reserve fund to backup the active fund loss
        const lossAmount = Math.abs(pnl);
        const activeFundAfterLoss = newActiveFund; // This is what user entered as new balance
        const actualLoss = currentActiveFund - activeFundAfterLoss; // Actual loss amount
        const transferFromReserve = Math.min(actualLoss, updatedFundData.reserve_fund);
        
        // Add the reserve transfer back to active fund to cover the loss
        updatedFundData.active_fund = activeFundAfterLoss + transferFromReserve;
        
        // Deduct the transfer amount from reserve fund
        updatedFundData.reserve_fund -= transferFromReserve;
        
        // The actual loss to total capital is only what reserve couldn't cover
        const uncoveredLoss = actualLoss - transferFromReserve;
      } else {
        // No profit/loss
        updatedFundData.active_fund = newActiveFund;
      }
      
      // Calculate new total capital (should always equal active + reserve + profit)
      updatedFundData.total_capital = updatedFundData.active_fund + updatedFundData.reserve_fund + updatedFundData.profit_fund;

      // Update fund data
      const { error: fundError } = await (supabase as any)
        .from('fund_data')
        .update({
          total_capital: updatedFundData.total_capital,
          active_fund: updatedFundData.active_fund,
          reserve_fund: updatedFundData.reserve_fund,
          profit_fund: updatedFundData.profit_fund,
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      // Add history record
      const { error: historyError } = await (supabase as any)
        .from('trading_history')
        .insert({
          user_id: userId,
          mode: mode,
          type: pnl >= 0 ? 'Win' : 'Loss',
          details: `Daily trading result: ${formatCurrency(pnl)}`,
          amount: pnl,
          end_balance: updatedFundData.total_capital,
          trade_date: data.trade_date,
          sub_user_name: subUserName,
        });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: "Trade recorded successfully",
      });

      goldForm.reset({ trade_date: new Date().toISOString().split('T')[0] });
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
    <Card>
      <CardHeader>
        <CardTitle>{t('recordTradeResult')}</CardTitle>
      </CardHeader>
      <CardContent>
        {mode === 'diamond' ? (
          <form onSubmit={diamondForm.handleSubmit(recordDiamondTrade)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="eow-balance">{t('endOfWeekActiveFundBalance')}</Label>
              <Input
                id="eow-balance"
                type="number"
                step="0.01"
                {...diamondForm.register('end_of_week_balance', { required: true })}
                placeholder="4800.50"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('processing') : t('recordWeeklyResult')}
            </Button>
          </form>
        ) : (
          <form onSubmit={goldForm.handleSubmit(recordGoldTrade)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trade-date">Date</Label>
                <Input
                  id="trade-date"
                  type="date"
                  {...goldForm.register('trade_date', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-balance">Active Fund Balance</Label>
                <Input
                  id="end-balance"
                  type="number"
                  step="0.01"
                  {...goldForm.register('end_balance', { required: true })}
                  placeholder="5120.75"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Recording...' : 'Record Daily Result'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeRecorder;