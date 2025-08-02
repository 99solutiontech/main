import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight } from 'lucide-react';

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

interface SubUser {
  id: string;
  name: string;
  mode: 'diamond' | 'gold';
  initial_capital: number;
  total_capital: number;
  active_fund: number;
  reserve_fund: number;
  profit_fund: number;
  created_at: string;
}

interface FundTransferProps {
  userId: string;
  fundData: FundData;
  subUsers: SubUser[];
  currentSubUser?: SubUser;
  onUpdate: () => void;
}

interface TransferForm {
  targetUserId: string;
  targetUserType: 'main' | 'sub';
  amount: number;
  fromFund: 'active_fund' | 'reserve_fund' | 'profit_fund';
  toFund: 'active_fund' | 'reserve_fund' | 'profit_fund';
}

const FundTransfer = ({ userId, fundData, subUsers, currentSubUser, onUpdate }: FundTransferProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const transferForm = useForm<TransferForm>();

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleTransfer = async (data: TransferForm) => {
    setLoading(true);
    try {
      const amount = data.amount;
      const fromField = data.fromFund;
      const toField = data.toFund;
      
      // Validate sufficient funds
      if (amount > fundData[fromField]) {
        throw new Error(`Insufficient funds in ${fromField.replace('_', ' ')}`);
      }

      // Get target fund data
      let targetFundData;
      if (data.targetUserType === 'main') {
        const { data: mainFund, error } = await supabase
          .from('fund_data')
          .select('*')
          .eq('user_id', userId)
          .eq('mode', fundData.mode)
          .is('sub_user_name', null)
          .single();
        
        if (error) throw error;
        targetFundData = mainFund;
      } else {
        const targetSubUser = subUsers.find(su => su.id === data.targetUserId);
        if (!targetSubUser) throw new Error('Target sub-user not found');
        
        const { data: subFund, error } = await supabase
          .from('fund_data')
          .select('*')
          .eq('id', targetSubUser.id)
          .single();
        
        if (error) throw error;
        targetFundData = subFund;
      }

      // Update source fund
      const newSourceFromValue = fundData[fromField] - amount;
      const newSourceTotal = fundData.active_fund + fundData.reserve_fund + fundData.profit_fund - amount;

      const { error: sourceError } = await supabase
        .from('fund_data')
        .update({
          ...fundData,
          total_capital: newSourceTotal,
          [fromField]: newSourceFromValue,
        })
        .eq('id', fundData.id);

      if (sourceError) throw sourceError;

      // Update target fund
      const newTargetToValue = targetFundData[toField] + amount;
      const newTargetTotal = targetFundData.active_fund + targetFundData.reserve_fund + targetFundData.profit_fund + amount;

      const { error: targetError } = await supabase
        .from('fund_data')
        .update({
          ...targetFundData,
          total_capital: newTargetTotal,
          [toField]: newTargetToValue,
        })
        .eq('id', targetFundData.id);

      if (targetError) throw targetError;

      // Record transaction history for both accounts
      const sourceDescription = `Transferred ${formatCurrency(amount)} to ${data.targetUserType === 'main' ? 'Main Account' : `Sub-user: ${subUsers.find(su => su.id === data.targetUserId)?.name}`}`;
      const targetDescription = `Received ${formatCurrency(amount)} from ${currentSubUser ? `Sub-user: ${currentSubUser.name}` : 'Main Account'}`;

      // Source transaction
      await supabase.from('transaction_history').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'transfer_out',
        from_fund: fromField.replace('_fund', ''),
        to_fund: toField.replace('_fund', ''),
        amount: amount,
        balance_before: fundData.total_capital,
        balance_after: newSourceTotal,
        description: sourceDescription,
        sub_user_name: currentSubUser?.name,
      });

      // Target transaction
      await supabase.from('transaction_history').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'transfer_in',
        from_fund: fromField.replace('_fund', ''),
        to_fund: toField.replace('_fund', ''),
        amount: amount,
        balance_before: targetFundData.total_capital,
        balance_after: newTargetTotal,
        description: targetDescription,
        sub_user_name: data.targetUserType === 'main' ? null : subUsers.find(su => su.id === data.targetUserId)?.name,
      });

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
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ArrowLeftRight className="h-5 w-5" />
          Account Transfer
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-user" className="text-foreground">Transfer To</Label>
            <Select onValueChange={(value) => {
              const [type, id] = value.split(':');
              transferForm.setValue('targetUserType', type as 'main' | 'sub');
              transferForm.setValue('targetUserId', id);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {!currentSubUser && (
                  <SelectItem value="main:main">Main Account</SelectItem>
                )}
                {subUsers
                  .filter(su => su.mode === fundData.mode && (!currentSubUser || su.name !== currentSubUser.name))
                  .map((subUser) => (
                    <SelectItem key={subUser.id} value={`sub:${subUser.id}`}>
                      {subUser.name} ({formatCurrency(subUser.total_capital)})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="from-fund" className="text-foreground">From Fund</Label>
              <Select onValueChange={(value) => transferForm.setValue('fromFund', value as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active_fund">
                    Active ({formatCurrency(fundData.active_fund)})
                  </SelectItem>
                  <SelectItem value="reserve_fund">
                    Reserve ({formatCurrency(fundData.reserve_fund)})
                  </SelectItem>
                  <SelectItem value="profit_fund">
                    Profit ({formatCurrency(fundData.profit_fund)})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="to-fund" className="text-foreground">To Fund</Label>
              <Select onValueChange={(value) => transferForm.setValue('toFund', value as any)}>
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
              placeholder="100.00"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : 'Transfer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default FundTransfer;