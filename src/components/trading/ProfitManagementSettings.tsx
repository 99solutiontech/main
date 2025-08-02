import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
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

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SettingsForm>({
    defaultValues: {
      profit_dist_active: fundData.profit_dist_active || 50,
      profit_dist_reserve: fundData.profit_dist_reserve || 25,
      profit_dist_profit: fundData.profit_dist_profit || 25,
    }
  });

  const watchedValues = watch();
  const total = watchedValues.profit_dist_active + watchedValues.profit_dist_reserve + watchedValues.profit_dist_profit;

  const updateSettings = async (data: SettingsForm) => {
    if (total !== 100) {
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
          profit_dist_active: data.profit_dist_active,
          profit_dist_reserve: data.profit_dist_reserve,
          profit_dist_profit: data.profit_dist_profit,
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
        description: `Updated profit distribution: Active ${data.profit_dist_active}%, Reserve ${data.profit_dist_reserve}%, Profit ${data.profit_dist_profit}%`,
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
          <DialogTitle>Profit Management Settings</DialogTitle>
          <DialogDescription>
            Configure how profits from trade results are distributed across your funds.
            These percentages apply when recording trade results.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(updateSettings)} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profit_dist_active">
                Active Fund Distribution (%)
              </Label>
              <Input
                id="profit_dist_active"
                type="number"
                min="0"
                max="100"
                {...register('profit_dist_active', { 
                  required: true, 
                  min: 0, 
                  max: 100,
                  valueAsNumber: true 
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit_dist_reserve">
                Reserve Fund Distribution (%)
              </Label>
              <Input
                id="profit_dist_reserve"
                type="number"
                min="0"
                max="100"
                {...register('profit_dist_reserve', { 
                  required: true, 
                  min: 0, 
                  max: 100,
                  valueAsNumber: true 
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profit_dist_profit">
                Profit Fund Distribution (%)
              </Label>
              <Input
                id="profit_dist_profit"
                type="number"
                min="0"
                max="100"
                {...register('profit_dist_profit', { 
                  required: true, 
                  min: 0, 
                  max: 100,
                  valueAsNumber: true 
                })}
              />
            </div>

            <div className="text-sm">
              <p className={`font-medium ${total === 100 ? 'text-green-600' : 'text-red-600'}`}>
                Total: {total}% {total !== 100 && '(Must equal 100%)'}
              </p>
              <div className="mt-2 text-muted-foreground">
                <p>Current: Active {watchedValues.profit_dist_active}%, Reserve {watchedValues.profit_dist_reserve}%, Profit {watchedValues.profit_dist_profit}%</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || total !== 100}>
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProfitManagementSettings;