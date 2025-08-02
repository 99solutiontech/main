import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Settings } from 'lucide-react';
import DepositSettings from './DepositSettings';

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

interface FundManagementProps {
  userId: string;
  fundData: FundData;
  subUserName?: string;
  onUpdate: () => void;
}

interface DepositForm {
  amount: number;
}

interface WithdrawForm {
  from: 'active_fund' | 'reserve_fund' | 'profit_fund';
  amount: number;
}

interface TransferForm {
  from: 'active_fund' | 'reserve_fund' | 'profit_fund';
  to: 'active_fund' | 'reserve_fund' | 'profit_fund';
  amount: number;
}

const FundManagement = ({ userId, fundData, subUserName, onUpdate }: FundManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const depositForm = useForm<DepositForm>();
  const withdrawForm = useForm<WithdrawForm>();
  const transferForm = useForm<TransferForm>();

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDeposit = async (data: DepositForm) => {
    setLoading(true);
    try {
      const amount = Number(data.amount);
      const toActive = amount * 0.4;
      const toReserve = amount * 0.6;

      const newActiveFund = fundData.active_fund + toActive;
      const newReserveFund = fundData.reserve_fund + toReserve;
      const newTotalCapital = fundData.total_capital + amount;

      const { error: fundError } = await supabase
        .from('fund_data')
        .update({
          total_capital: newTotalCapital,
          active_fund: newActiveFund,
          reserve_fund: newReserveFund,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      const { error: historyError } = await supabase.from('fund_transactions').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'deposit',
        to_fund: 'mixed',
        amount: amount,
        balance_before: fundData.total_capital,
        balance_after: newTotalCapital,
        description: `Deposited ${formatCurrency(amount)} (40% to Active, 60% to Reserve)`,
        sub_user_name: subUserName,
      });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: "Deposit recorded successfully",
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

  const handleWithdraw = async (data: WithdrawForm) => {
    setLoading(true);
    try {
      const amount = Number(data.amount);
      const fromField = data.from;
      
      if (amount > fundData[fromField]) {
        throw new Error(`Insufficient funds in ${fromField.replace('_', ' ')}`);
      }

      const newFundValue = fundData[fromField] - amount;
      const newTotalCapital = fundData.total_capital - amount;

      const { error: fundError } = await supabase
        .from('fund_data')
        .update({
          [fromField]: newFundValue,
          total_capital: newTotalCapital,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      const { error: historyError } = await supabase.from('fund_transactions').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'withdraw',
        from_fund: fromField.replace('_fund', ''),
        amount: amount,
        balance_before: fundData.total_capital,
        balance_after: newTotalCapital,
        description: `Withdrew ${formatCurrency(amount)} from ${fromField.replace('_', ' ')}`,
        sub_user_name: subUserName,
      });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: "Withdrawal recorded successfully",
      });

      withdrawForm.reset();
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

  const handleTransfer = async (data: TransferForm) => {
    setLoading(true);
    try {
      const amount = Number(data.amount);
      const fromField = data.from;
      const toField = data.to;
      
      if (fromField === toField) {
        throw new Error('Source and destination must be different');
      }
      
      if (amount > fundData[fromField]) {
        throw new Error(`Insufficient funds in ${fromField.replace('_', ' ')}`);
      }

      const newFromValue = fundData[fromField] - amount;
      const newToValue = fundData[toField] + amount;

      const { error: fundError } = await supabase
        .from('fund_data')
        .update({
          [fromField]: newFromValue,
          [toField]: newToValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fundData.id);

      if (fundError) throw fundError;

      const { error: historyError } = await supabase.from('fund_transactions').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'transfer',
        from_fund: fromField.replace('_fund', ''),
        to_fund: toField.replace('_fund', ''),
        amount: amount,
        balance_before: fundData.total_capital,
        balance_after: fundData.total_capital, // Total doesn't change for internal transfers
        description: `Transferred ${formatCurrency(amount)} from ${fromField.replace('_', ' ')} to ${toField.replace('_', ' ')}`,
        sub_user_name: subUserName,
      });

      if (historyError) throw historyError;

      toast({
        title: "Success",
        description: "Transfer completed successfully",
      });

      transferForm.reset();
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
        <CardTitle className="flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fund Management
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowSettings(!showSettings)}
            className="h-8 w-8 p-0"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-4">
            <DepositSettings 
              fundData={fundData} 
              subUserName={subUserName}
              onUpdate={onUpdate}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}
        
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <form onSubmit={depositForm.handleSubmit(handleDeposit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-foreground">Amount (USD)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  {...depositForm.register('amount', { required: true, min: 0.01 })}
                  placeholder="1000.00"
                />
                <p className="text-sm text-muted-foreground">
                  Will be split: 40% to Active Fund, 60% to Reserve Fund
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : 'Deposit'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <form onSubmit={withdrawForm.handleSubmit(handleWithdraw)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-from" className="text-foreground">Withdraw From</Label>
                <Select onValueChange={(value) => withdrawForm.setValue('from', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fund" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active_fund">
                      Active Fund ({formatCurrency(fundData.active_fund)})
                    </SelectItem>
                    <SelectItem value="reserve_fund">
                      Reserve Fund ({formatCurrency(fundData.reserve_fund)})
                    </SelectItem>
                    <SelectItem value="profit_fund">
                      Profit Fund ({formatCurrency(fundData.profit_fund)})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount" className="text-foreground">Amount (USD)</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  {...withdrawForm.register('amount', { required: true, min: 0.01 })}
                  placeholder="500.00"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : 'Withdraw'}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="transfer-from" className="text-foreground">From</Label>
                  <Select onValueChange={(value) => transferForm.setValue('from', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active_fund">
                        Active Fund ({formatCurrency(fundData.active_fund)})
                      </SelectItem>
                      <SelectItem value="reserve_fund">
                        Reserve Fund ({formatCurrency(fundData.reserve_fund)})
                      </SelectItem>
                      <SelectItem value="profit_fund">
                        Profit Fund ({formatCurrency(fundData.profit_fund)})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-to" className="text-foreground">To</Label>
                  <Select onValueChange={(value) => transferForm.setValue('to', value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active_fund">Active Fund</SelectItem>
                      <SelectItem value="reserve_fund">Reserve Fund</SelectItem>
                      <SelectItem value="profit_fund">Profit Fund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-amount" className="text-foreground">Amount (USD)</Label>
                <Input
                  id="transfer-amount"
                  type="number"
                  step="0.01"
                  {...transferForm.register('amount', { required: true, min: 0.01 })}
                  placeholder="200.00"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Processing...' : 'Transfer'}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FundManagement;