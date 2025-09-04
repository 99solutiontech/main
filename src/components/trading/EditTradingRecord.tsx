
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TradingRecord {
  id: string;
  user_id: string;
  mode: string;
  type: string;
  details: string;
  amount?: number;
  end_balance: number;
  start_balance?: number;
  profit_loss?: number;
  trade_date?: string;
  created_at: string;
}

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

interface EditTradingRecordProps {
  record: TradingRecord;
  fundData: FundData;
  onUpdate: () => void;
}

interface EditFormData {
  new_active_fund: number;
  rebate: number;
}

const EditTradingRecord = ({ record, fundData, onUpdate }: EditTradingRecordProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { fromDisplay, format } = useCurrency();

  // Don't render if fundData is not available
  if (!fundData) {
    return null;
  }

  // Parse existing values from record details
  const parseExistingValues = () => {
    try {
      const details = record.details || '';
      const activeFundMatch = details.match(/New Active Fund:\s*([0-9,]+(?:\.[0-9]+)?)/);
      const rebateMatch = details.match(/Rebate:\s*([0-9,]+(?:\.[0-9]+)?)/);
      
      const activeFund = activeFundMatch ? parseFloat(activeFundMatch[1].replace(/,/g, '')) : 0;
      const rebate = rebateMatch ? parseFloat(rebateMatch[1].replace(/,/g, '')) : 0;
      
      return { activeFund, rebate };
    } catch (error) {
      return { activeFund: 0, rebate: 0 };
    }
  };

  const existingValues = parseExistingValues();

  const form = useForm<EditFormData>({
    defaultValues: {
      new_active_fund: existingValues.activeFund,
      rebate: existingValues.rebate,
    },
  });

  const updateRecord = async (data: EditFormData) => {
    // Additional safety check
    if (!fundData || fundData.active_fund === undefined) {
      toast({
        title: 'Error',
        description: 'Fund data is not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const newActiveFundUsd = fromDisplay(Number(data.new_active_fund || 0));
      const rebateUsd = fromDisplay(Number(data.rebate || 0));
      
      // Check if this is the first edit - create snapshot if needed
      const { data: existingSnapshot } = await supabase
        .from('trading_record_snapshots')
        .select('*')
        .eq('trading_record_id', record.id)
        .single();

      let originalFundState;
      if (!existingSnapshot) {
        // First edit - create snapshot of current fund state
        originalFundState = {
          active_fund: fundData.active_fund,
          reserve_fund: fundData.reserve_fund,
          profit_fund: fundData.profit_fund,
          total_capital: fundData.total_capital,
          profit_dist_active: fundData.profit_dist_active,
          profit_dist_reserve: fundData.profit_dist_reserve,
          profit_dist_profit: fundData.profit_dist_profit
        };

        await supabase
          .from('trading_record_snapshots')
          .insert({
            trading_record_id: record.id,
            user_id: record.user_id,
            mode: record.mode,
            sub_user_name: null, // Will be set from the fund data query
            original_fund_data: originalFundState
          });
      } else {
        originalFundState = existingSnapshot.original_fund_data;
      }

      // Parse the original values from the existing record to maintain consistent baseline
      const existingValues = parseExistingValues();
      const originalNewActiveFund = fromDisplay(existingValues.activeFund);
      const originalRebate = fromDisplay(existingValues.rebate);
      
      // Calculate what the active fund was before this trade was recorded
      const originalProfitUsd = Number(record.profit_loss || 0);
      const originalActiveFundBeforeTrade = (originalNewActiveFund + originalRebate) - originalProfitUsd;
      
      // Now calculate new profit using the same baseline
      const actualProfitUsd = (newActiveFundUsd + rebateUsd) - originalActiveFundBeforeTrade;
      
      // Calculate the new end balance after this trade
      const newEndBalance = originalActiveFundBeforeTrade + actualProfitUsd;
      
      // Calculate fund updates based on the change in profit
      const profitDifference = actualProfitUsd - originalProfitUsd;
      
      // Apply fund redistribution logic
      let newActiveFund = originalFundState.active_fund;
      let newReserveFund = originalFundState.reserve_fund;
      let newProfitFund = originalFundState.profit_fund;
      
      if (profitDifference >= 0) {
        // Positive change - distribute the additional profit
        const activeShare = profitDifference * (originalFundState.profit_dist_active / 100);
        const reserveShare = profitDifference * (originalFundState.profit_dist_reserve / 100);
        const profitShare = profitDifference * (originalFundState.profit_dist_profit / 100);
        
        newActiveFund += activeShare;
        newReserveFund += reserveShare;
        newProfitFund += profitShare;
      } else {
        // Negative change - reduce funds in reverse order (profit -> reserve -> active)
        let remainingLoss = Math.abs(profitDifference);
        
        // First, reduce profit fund
        const profitReduction = Math.min(remainingLoss, newProfitFund);
        newProfitFund -= profitReduction;
        remainingLoss -= profitReduction;
        
        // Then reduce reserve fund if needed
        if (remainingLoss > 0) {
          const reserveReduction = Math.min(remainingLoss, newReserveFund);
          newReserveFund -= reserveReduction;
          remainingLoss -= reserveReduction;
        }
        
        // Finally reduce active fund if needed
        if (remainingLoss > 0) {
          newActiveFund -= remainingLoss;
        }
      }
      
      const newTotalCapital = newActiveFund + newReserveFund + newProfitFund;
      
      // Create the note with the correct profit calculation
      const note = record.mode === 'diamond' 
        ? `New Active Fund: ${format(newActiveFundUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Profit: ${format(actualProfitUsd, { showLabel: true })}`
        : `Daily ${record.trade_date || new Date().toISOString().split('T')[0]} → New Active Fund: ${format(newActiveFundUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Profit: ${format(actualProfitUsd, { showLabel: true })}`;

      // Update both trading record and fund data in parallel
      const [recordResult, fundResult] = await Promise.all([
        supabase
          .from('trading_history')
          .update({
            details: note,
            profit_loss: actualProfitUsd,
            end_balance: newEndBalance,
            type: actualProfitUsd >= 0 ? 'profit' : 'loss',
          })
          .eq('id', record.id),
        
        supabase
          .from('fund_data')
          .update({
            active_fund: newActiveFund,
            reserve_fund: newReserveFund,
            profit_fund: newProfitFund,
            total_capital: newTotalCapital,
            updated_at: new Date().toISOString()
          })
          .eq('id', fundData.id)
      ]);

      if (recordResult.error) throw recordResult.error;
      if (fundResult.error) throw fundResult.error;

      toast({
        title: 'Success',
        description: 'Trading record and fund balances updated successfully',
      });

      setOpen(false);
      onUpdate();
      window.dispatchEvent(new CustomEvent('refreshTradingData'));
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-muted">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trading Record</DialogTitle>
          <DialogDescription>
            Modify the trading record by entering the new active fund value and rebate
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(updateRecord)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new_active_fund">New Active Fund Value</Label>
            <Input
              id="new_active_fund"
              type="number"
              step="0.01"
              {...form.register('new_active_fund', { required: true, valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rebate">Rebate</Label>
            <Input
              id="rebate"
              type="number"
              step="0.01"
              {...form.register('rebate', { valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditTradingRecord;
