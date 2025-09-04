import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

interface ProfitManagementSettingsProps {
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
}

interface SettingsForm {
  profit_dist_active: number;
  profit_dist_reserve: number;
  profit_dist_profit: number;
}

const ProfitManagementSettings = ({ fundData, subUserName, onUpdate }: ProfitManagementSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SettingsForm>({
    defaultValues: {
      profit_dist_active: fundData.profit_dist_active || 0,
      profit_dist_reserve: fundData.profit_dist_reserve || 0,
      profit_dist_profit: fundData.profit_dist_profit || 100,
    }
  });

  const watchedValues = watch();
  const total = Number(watchedValues.profit_dist_active || 0) + Number(watchedValues.profit_dist_reserve || 0) + Number(watchedValues.profit_dist_profit || 0);

  // Auto-adjust profit percentage when active or reserve changes
  useEffect(() => {
    const activePercent = Number(watchedValues.profit_dist_active || 0);
    const reservePercent = Number(watchedValues.profit_dist_reserve || 0);
    const calculatedProfit = 100 - activePercent - reservePercent;
    
    // Only update if the calculated profit is different and within valid range
    if (calculatedProfit >= 0 && calculatedProfit <= 100 && calculatedProfit !== Number(watchedValues.profit_dist_profit || 0)) {
      setValue('profit_dist_profit', calculatedProfit);
    }
  }, [watchedValues.profit_dist_active, watchedValues.profit_dist_reserve, setValue]);

  const updateSettings = async (data: SettingsForm) => {
    const activePercent = Number(data.profit_dist_active) || 0;
    const reservePercent = Number(data.profit_dist_reserve) || 0;
    const profitPercent = Number(data.profit_dist_profit) || 0;
    const totalPercent = activePercent + reservePercent + profitPercent;

    if (totalPercent !== 100) {
      toast({
        title: "Error",
        description: "Total profit distribution must equal 100%",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('fund_data')
        .update({
          profit_dist_active: activePercent,
          profit_dist_reserve: reservePercent,
          profit_dist_profit: profitPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundData.id);

      if (error) throw error;

      // Record the settings change in transaction history
      await supabase.from('transaction_history').insert({
        user_id: fundData.user_id,
        mode: fundData.mode,
        transaction_type: 'settings_update',
        amount: 0,
        balance_before: fundData.total_capital,
        balance_after: fundData.total_capital,
        description: `Updated profit distribution: Active ${activePercent}%, Reserve ${reservePercent}%, Profit ${profitPercent}%`,
        sub_user_name: subUserName,
      });

      toast({
        title: "Success",
        description: "Profit distribution settings updated successfully",
      });

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
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('profitManagementSettings')}</DialogTitle>
          <DialogDescription>
            {t('configureHowProfitsDistributed')}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(updateSettings)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profit_dist_active">
                {t('activeFundDistribution')}
              </Label>
              <Input
                id="profit_dist_active"
                type="number"
                min="0"
                max="100"
                {...register('profit_dist_active', { 
                  required: true, 
                  min: 0, 
                  max: 100
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit_dist_reserve">
                {t('reserveFundDistribution')}
              </Label>
              <Input
                id="profit_dist_reserve"
                type="number"
                min="0"
                max="100"
                {...register('profit_dist_reserve', { 
                  required: true, 
                  min: 0, 
                  max: 100
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit_dist_profit">
                {t('profitFundDistribution')} (Auto-calculated)
              </Label>
              <Input
                id="profit_dist_profit"
                type="number"
                min="0"
                max="100"
                readOnly
                className="bg-muted"
                {...register('profit_dist_profit', { 
                  required: true, 
                  min: 0, 
                  max: 100
                })}
              />
            </div>

            <div className="text-sm">
              <p className={`font-medium ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
                {t('total')}: {total}% {total !== 100 && '(Must equal 100%)'}
              </p>
              <div className="mt-2 text-muted-foreground">
                <p>{t('current')}: Active {Number(watchedValues.profit_dist_active || 0)}%, Reserve {Number(watchedValues.profit_dist_reserve || 0)}%, Profit {Number(watchedValues.profit_dist_profit || 0)}%</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit" disabled={loading || total !== 100}>
              {loading ? t('updating') : t('updateSettings')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfitManagementSettings;