import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface FundData {
  id: string;
  user_id: string;
  mode: 'diamond' | 'gold';
  sub_user_name?: string | null;
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
  // risk_percent is not stored in fund_data; kept optional for runtime usage
  risk_percent?: number;
}

interface LotSizeSettingsProps {
  fundData: FundData;
  onUpdate: () => void;
}

interface SettingsForm {
  lot_base_capital: number;
  lot_base_lot: number;
  risk_percent: number;
}

const LotSizeSettings = ({ fundData, onUpdate }: LotSizeSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<SettingsForm>({
    defaultValues: {
      lot_base_capital: fundData.lot_base_capital || 1000,
      lot_base_lot: fundData.lot_base_lot || 0.4,
      risk_percent: fundData.risk_percent || 40,
    },
  });

  useEffect(() => {
    const loadRiskPercent = async () => {
      try {
        let query = supabase
          .from('user_settings')
          .select('lot_size_settings')
          .eq('user_id', fundData.user_id)
          .eq('mode', fundData.mode);
        if (fundData.sub_user_name) {
          query = query.eq('sub_user_name', fundData.sub_user_name);
        } else {
          query = query.is('sub_user_name', null);
        }
        const { data, error } = await query.maybeSingle();
        if (!error && (data as any)?.lot_size_settings?.risk_percent != null) {
          form.setValue('risk_percent', Number((data as any).lot_size_settings.risk_percent));
        }
      } catch {}
    };
    loadRiskPercent();
  }, [fundData.id]);

  const updateSettings = async (data: SettingsForm) => {
    setLoading(true);
    try {
      // 1) Update fund_data with supported fields only
      const { error: fundError } = await supabase
        .from('fund_data')
        .update({
          lot_base_capital: data.lot_base_capital,
          lot_base_lot: data.lot_base_lot,
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      // 2) Persist risk_percent in user_settings.lot_size_settings JSON
      // Check for existing settings row
      let query = supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', fundData.user_id)
        .eq('mode', fundData.mode);
      if (fundData.sub_user_name) {
        query = query.eq('sub_user_name', fundData.sub_user_name);
      } else {
        query = query.is('sub_user_name', null);
      }
      const { data: existing, error: fetchError } = await query.maybeSingle();
      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = No rows; ignore
        throw fetchError;
      }

      if (existing?.id) {
        const { error: updateSettingsError } = await supabase
          .from('user_settings')
          .update({ lot_size_settings: { risk_percent: data.risk_percent } })
          .eq('id', existing.id);
        if (updateSettingsError) throw updateSettingsError;
      } else {
        const { error: insertSettingsError } = await supabase
          .from('user_settings')
          .insert({
            user_id: fundData.user_id,
            mode: fundData.mode,
            sub_user_name: fundData.sub_user_name || null,
            lot_size_settings: { risk_percent: data.risk_percent },
          });
        if (insertSettingsError) throw insertSettingsError;
      }

      toast({
        title: 'Success',
        description: 'Lot size settings updated successfully',
      });

      setOpen(false);
      onUpdate();
      // Notify listeners that trading data/settings changed
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
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 absolute top-2 right-2">
          <Settings className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Risk and Lot Size Settings</DialogTitle>
          <DialogDescription>
            Configure the base capital, lot size, and risk percentage for calculations
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(updateSettings)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lot_base_capital" className="text-foreground">{t('baseCapital')}</Label>
            <Input
              id="lot_base_capital"
              type="number"
              step="0.01"
              {...form.register('lot_base_capital', { required: true, min: 0.01 })}
              placeholder="1000.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lot_base_lot" className="text-foreground">{t('baseLotSize')}</Label>
            <Input
              id="lot_base_lot"
              type="number"
              step="0.01"
              {...form.register('lot_base_lot', { required: true, min: 0.01 })}
              placeholder="0.40"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk_percent" className="text-foreground">Base Risk Percent of Active Fund (%)</Label>
            <Input
              id="risk_percent"
              type="number"
              step="0.1"
              min="1"
              max="100"
              {...form.register('risk_percent', { 
                required: true, 
                valueAsNumber: true,
                min: 1,
                max: 100
              })}
              placeholder="40"
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

export default LotSizeSettings;