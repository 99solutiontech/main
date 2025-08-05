import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import NewDepositAllocation from './NewDepositAllocation';

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

interface NewDepositSettingsProps {
  userId: string;
  mode: 'diamond' | 'gold';
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
}

interface DepositForm {
  depositAmount: number;
}

interface AllocationSettings {
  activePercentage: number;
  reservePercentage: number;
}

const NewDepositSettings = ({ userId, mode, fundData, subUserName, onUpdate }: NewDepositSettingsProps) => {
  const [loading, setLoading] = useState(false);
  const [allocationSettings, setAllocationSettings] = useState<AllocationSettings>({
    activePercentage: 40,
    reservePercentage: 60
  });
  const { toast } = useToast();
  const { t } = useLanguage();

  const depositForm = useForm<DepositForm>();
  const watchedDeposit = depositForm.watch('depositAmount');

  // Load persistent allocation settings
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem(`depositSettings_${userId}_${mode}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setAllocationSettings(parsed);
      }
    };
    loadSettings();
  }, [userId, mode]);

  const updateAllocationSettings = (activePercent: number) => {
    const reservePercent = 100 - activePercent;
    const newSettings = {
      activePercentage: activePercent,
      reservePercentage: reservePercent
    };
    setAllocationSettings(newSettings);
    localStorage.setItem(`depositSettings_${userId}_${mode}`, JSON.stringify(newSettings));
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const calculateSplit = (amount: number) => {
    const activeAmount = (amount * allocationSettings.activePercentage) / 100;
    const reserveAmount = (amount * allocationSettings.reservePercentage) / 100;
    return { activeAmount, reserveAmount };
  };

  const processDeposit = async (data: DepositForm) => {
    setLoading(true);
    try {
      const depositAmount = Number(data.depositAmount);
      if (depositAmount <= 0) {
        throw new Error('Deposit amount must be greater than 0');
      }

      const { activeAmount, reserveAmount } = calculateSplit(depositAmount);

      // Update fund data
      const updatedFundData = {
        total_capital: fundData.total_capital + depositAmount,
        active_fund: fundData.active_fund + activeAmount,
        reserve_fund: fundData.reserve_fund + reserveAmount,
        updated_at: new Date().toISOString()
      };

      const { error: fundError } = await supabase
        .from('fund_data')
        .update(updatedFundData)
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      // Record the deposit transaction
      const { error: historyError } = await supabase.from('transaction_history').insert({
        user_id: userId,
        mode: mode,
        transaction_type: 'deposit',
        amount: depositAmount,
        balance_before: fundData.total_capital,
        balance_after: updatedFundData.total_capital,
        description: `Deposit: ${formatCurrency(depositAmount)} split ${allocationSettings.activePercentage}% active (${formatCurrency(activeAmount)}), ${allocationSettings.reservePercentage}% reserve (${formatCurrency(reserveAmount)})`,
        sub_user_name: subUserName,
      });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: `Deposit of ${formatCurrency(depositAmount)} processed successfully`,
      });

      depositForm.reset();
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
        <div className="flex items-center justify-between">
          <CardTitle>New Deposit</CardTitle>
          <NewDepositAllocation 
            userId={userId} 
            mode={mode} 
            onUpdate={() => {
              // Force reload settings after update
              const savedSettings = localStorage.getItem(`depositSettings_${userId}_${mode}`);
              if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                setAllocationSettings(parsed);
              }
            }} 
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allocation Settings */}
        <div className="space-y-4">
          <h4 className="font-medium">Deposit Allocation Settings</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activePercent">Active Fund %</Label>
              <Input
                id="activePercent"
                type="number"
                min="0"
                max="100"
                value={allocationSettings.activePercentage}
                onChange={(e) => {
                  const value = Number(e.target.value) || 0;
                  if (value >= 0 && value <= 100) {
                    updateAllocationSettings(value);
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reservePercent">Reserve Fund %</Label>
              <Input
                id="reservePercent"
                type="number"
                min="0"
                max="100"
                value={allocationSettings.reservePercentage}
                onChange={(e) => {
                  const value = Number(e.target.value) || 0;
                  if (value >= 0 && value <= 100) {
                    updateAllocationSettings(100 - value);
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        <form onSubmit={depositForm.handleSubmit(processDeposit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="depositAmount">Deposit Amount</Label>
            <Input
              id="depositAmount"
              type="number"
              step="0.01"
              min="0.01"
              {...depositForm.register('depositAmount', { required: true, min: 0.01 })}
              placeholder="1000.00"
            />
          </div>

          {/* Real-time Split Preview */}
          {watchedDeposit && watchedDeposit > 0 && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-medium mb-2">Will be split:</h4>
              <div className="text-sm space-y-1">
                <div>{allocationSettings.activePercentage}% to Active Fund: {formatCurrency(calculateSplit(watchedDeposit).activeAmount)}</div>
                <div>{allocationSettings.reservePercentage}% to Reserve Fund: {formatCurrency(calculateSplit(watchedDeposit).reserveAmount)}</div>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Process Deposit'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewDepositSettings;