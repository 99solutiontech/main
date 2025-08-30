
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

  const form = useForm<EditFormData>({
    defaultValues: {
      new_active_fund: 0,
      rebate: 0,
    },
  });

  const updateRecord = async (data: EditFormData) => {
    setLoading(true);
    try {
      const newActiveFundUsd = fromDisplay(Number(data.new_active_fund || 0));
      const rebateUsd = fromDisplay(Number(data.rebate || 0));
      const currentActiveFund = Number(fundData.active_fund);
      
      // Calculate actual profit: (new active fund + rebate) - current active fund
      const actualProfitUsd = (newActiveFundUsd + rebateUsd) - currentActiveFund;
      
      // Calculate fund distribution
      let updated = { 
        active_fund: currentActiveFund,
        reserve_fund: Number(fundData.reserve_fund),
        profit_fund: Number(fundData.profit_fund),
        total_capital: Number(fundData.total_capital),
      };

      // Distribute the actual profit according to settings
      if (actualProfitUsd > 0) {
        const toActive = (actualProfitUsd * (fundData.profit_dist_active ?? 50)) / 100;
        const toReserve = (actualProfitUsd * (fundData.profit_dist_reserve ?? 25)) / 100;
        const toProfit = (actualProfitUsd * (fundData.profit_dist_profit ?? 25)) / 100;
        updated.active_fund += toActive;
        updated.reserve_fund += toReserve;
        updated.profit_fund += toProfit;
      } else if (actualProfitUsd < 0) {
        const loss = Math.abs(actualProfitUsd);
        const fromReserve = Math.min(loss, updated.reserve_fund);
        updated.active_fund -= (loss - fromReserve);
        updated.reserve_fund -= fromReserve;
      }

      updated.total_capital = updated.active_fund + updated.reserve_fund + updated.profit_fund;

      // Create the note with the same format as TradeRecorder
      const note = record.mode === 'diamond' 
        ? `New Active Fund: ${format(newActiveFundUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Profit: ${format(actualProfitUsd, { showLabel: true })}`
        : `Daily ${record.trade_date || new Date().toISOString().split('T')[0]} → New Active Fund: ${format(newActiveFundUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Profit: ${format(actualProfitUsd, { showLabel: true })}`;

      // Update the trading record
      const { error: recordError } = await supabase
        .from('trading_history')
        .update({
          details: note,
          profit_loss: actualProfitUsd,
          end_balance: updated.total_capital,
          type: actualProfitUsd >= 0 ? 'profit' : 'loss',
        })
        .eq('id', record.id);

      if (recordError) throw recordError;

      // Update the fund data
      const { error: fundError } = await supabase
        .from('fund_data')
        .update(updated)
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      toast({
        title: 'Success',
        description: 'Trading record updated successfully',
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
