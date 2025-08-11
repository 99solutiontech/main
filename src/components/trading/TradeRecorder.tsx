import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';

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
  real_profit?: number;
  rebate?: number;
}

interface GoldForm {
  trade_date: string;
  real_profit?: number;
  rebate?: number;
}

const TradeRecorder = ({ userId, mode, fundData, subUserName, onUpdate }: TradeRecorderProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const { fromDisplay, format } = useCurrency();
  
  const diamondForm = useForm<DiamondForm>();
  const goldForm = useForm<GoldForm>({
    defaultValues: {
      trade_date: new Date().toISOString().split('T')[0]
    }
  });

  const recordTrade = async (pnlUsd: number, note: string) => {
    let updated = { 
      active_fund: Number(fundData.active_fund),
      reserve_fund: Number(fundData.reserve_fund),
      profit_fund: Number(fundData.profit_fund),
      total_capital: Number(fundData.total_capital),
    };

    if (pnlUsd > 0) {
      const toActive = (pnlUsd * (fundData.profit_dist_active ?? 50)) / 100;
      const toReserve = (pnlUsd * (fundData.profit_dist_reserve ?? 25)) / 100;
      const toProfit = (pnlUsd * (fundData.profit_dist_profit ?? 25)) / 100;
      updated.active_fund += toActive;
      updated.reserve_fund += toReserve;
      updated.profit_fund += toProfit;
    } else if (pnlUsd < 0) {
      const loss = Math.abs(pnlUsd);
      const fromReserve = Math.min(loss, updated.reserve_fund);
      updated.active_fund -= (loss - fromReserve);
      updated.reserve_fund -= fromReserve;
    }

    updated.total_capital = updated.active_fund + updated.reserve_fund + updated.profit_fund;

    const { error: fundError } = await supabase
      .from('fund_data')
      .update(updated)
      .eq('id', fundData.id);
    if (fundError) throw fundError;

    const { error: historyError } = await supabase
      .from('trading_history')
      .insert({
        user_id: userId,
        mode,
        type: pnlUsd >= 0 ? 'profit' : 'loss',
        details: note,
        start_balance: Number(fundData.total_capital),
        end_balance: updated.total_capital,
        profit_loss: pnlUsd,
        sub_user_name: subUserName,
      });
    if (historyError) throw historyError;
  };

  const recordDiamondTrade = async (data: DiamondForm) => {
    setLoading(true);
    try {
      const realUsd = fromDisplay(Number(data.real_profit || 0));
      const rebateUsd = fromDisplay(Number(data.rebate || 0));
      const pnlUsd = realUsd + rebateUsd;
      const note = `Real: ${format(realUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Total: ${format(pnlUsd, { showLabel: true })}`;
      await recordTrade(pnlUsd, note);
      toast({ title: 'Success', description: 'Trade recorded successfully' });
      diamondForm.reset();
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const recordGoldTrade = async (data: GoldForm) => {
    setLoading(true);
    try {
      const realUsd = fromDisplay(Number(data.real_profit || 0));
      const rebateUsd = fromDisplay(Number(data.rebate || 0));
      const pnlUsd = realUsd + rebateUsd;
      const note = `Daily ${data.trade_date} → Real: ${format(realUsd, { showLabel: true })} + Rebate: ${format(rebateUsd, { showLabel: true })} = Total: ${format(pnlUsd, { showLabel: true })}`;
      await recordTrade(pnlUsd, note);
      toast({ title: 'Success', description: 'Trade recorded successfully' });
      goldForm.reset({ trade_date: new Date().toISOString().split('T')[0] });
      onUpdate();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="real-profit">Real profit</Label>
                <Input id="real-profit" type="number" step="0.01" placeholder="0" {...diamondForm.register('real_profit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rebate">Rebate</Label>
                <Input id="rebate" type="number" step="0.01" placeholder="0" {...diamondForm.register('rebate')} />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t('processing') : 'Record Weekly Result'}
            </Button>
          </form>
        ) : (
          <form onSubmit={goldForm.handleSubmit(recordGoldTrade)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="trade-date">Date</Label>
                <Input id="trade-date" type="date" {...goldForm.register('trade_date', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="real-profit-g">Real profit</Label>
                <Input id="real-profit-g" type="number" step="0.01" placeholder="0" {...goldForm.register('real_profit')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rebate-g">Rebate</Label>
                <Input id="rebate-g" type="number" step="0.01" placeholder="0" {...goldForm.register('rebate')} />
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
