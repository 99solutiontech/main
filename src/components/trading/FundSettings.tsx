import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface FundSettingsProps {
  fundData: FundData;
  onUpdate: () => void;
}

interface SettingsForm {
  profit_dist_active: number;
  profit_dist_reserve: number;
  profit_dist_profit: number;
  lot_base_capital: number;
  lot_base_lot: number;
}

const FundSettings = ({ fundData, onUpdate }: FundSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const form = useForm<SettingsForm>({
    defaultValues: {
      profit_dist_active: fundData.profit_dist_active || 50,
      profit_dist_reserve: fundData.profit_dist_reserve || 25,
      profit_dist_profit: fundData.profit_dist_profit || 25,
      lot_base_capital: fundData.lot_base_capital || 1000,
      lot_base_lot: fundData.lot_base_lot || 0.4,
    }
  });

  const updateSettings = async (data: SettingsForm) => {
    // Validate profit distribution adds up to 100%
    const totalPercent = data.profit_dist_active + data.profit_dist_reserve + data.profit_dist_profit;
    if (totalPercent !== 100) {
      toast({
        title: t('error'),
        description: "Profit distribution must add up to 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await (supabase as any)
        .from('fund_data')
        .update({
          profit_dist_active: data.profit_dist_active,
          profit_dist_reserve: data.profit_dist_reserve,
          profit_dist_profit: data.profit_dist_profit,
          lot_base_capital: data.lot_base_capital,
          lot_base_lot: data.lot_base_lot,
        })
        .eq('id', fundData.id);

      if (error) throw error;

      toast({
        title: t('success'),
        description: "Settings updated successfully",
      });

      onUpdate();
    } catch (error: any) {
      toast({
        title: t('error'),
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
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Fund Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(updateSettings)} className="space-y-4">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Profit Distribution (%)</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <div>
                  <Label htmlFor="active" className="text-xs">Active Fund</Label>
                  <Input
                    id="active"
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('profit_dist_active', { required: true, min: 0, max: 100 })}
                  />
                </div>
                <div>
                  <Label htmlFor="reserve" className="text-xs">Reserve Fund</Label>
                  <Input
                    id="reserve"
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('profit_dist_reserve', { required: true, min: 0, max: 100 })}
                  />
                </div>
                <div>
                  <Label htmlFor="profit" className="text-xs">Profit Fund</Label>
                  <Input
                    id="profit"
                    type="number"
                    min="0"
                    max="100"
                    {...form.register('profit_dist_profit', { required: true, min: 0, max: 100 })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Lot Size Settings</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="base-capital" className="text-xs">Base Capital</Label>
                  <Input
                    id="base-capital"
                    type="number"
                    min="100"
                    step="100"
                    {...form.register('lot_base_capital', { required: true, min: 100 })}
                  />
                </div>
                <div>
                  <Label htmlFor="base-lot" className="text-xs">Base Lot</Label>
                  <Input
                    id="base-lot"
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...form.register('lot_base_lot', { required: true, min: 0.01 })}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Updating...' : 'Update Settings'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FundSettings;