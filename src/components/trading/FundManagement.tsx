import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { DollarSign } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import DepositSettings from './DepositSettings';
import ProfitManagementSettings from './ProfitManagementSettings';

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
}

interface FundManagementProps {
  userId: string;
  fundData: FundData;
  subUsers?: SubUser[];
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
  targetUser?: string;
  targetUserType?: 'main' | 'sub';
}

const FundManagement = ({ userId, fundData, subUsers = [], subUserName, onUpdate }: FundManagementProps) => {
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isTransferBetweenAccounts, setIsTransferBetweenAccounts] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const depositForm = useForm<DepositForm>();
  const withdrawForm = useForm<WithdrawForm>();
  const transferForm = useForm<TransferForm>();

  // New Deposit Settings (persisted per user/mode)
  const [depositActivePct, setDepositActivePct] = useState<number>(50);
  const [depositReservePct, setDepositReservePct] = useState<number>(50);

  const loadDepositSettings = () => {
    const key = `depositSettings_${fundData.user_id}_${fundData.mode}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        if (typeof s.activePercentage === 'number' && typeof s.reservePercentage === 'number') {
          setDepositActivePct(s.activePercentage);
          setDepositReservePct(s.reservePercentage);
          return;
        }
      } catch {}
    }
    setDepositActivePct(50);
    setDepositReservePct(50);
  };

  useEffect(() => {
    loadDepositSettings();
    const handler = () => loadDepositSettings();
    window.addEventListener('depositSettingsUpdated', handler);
    return () => window.removeEventListener('depositSettingsUpdated', handler);
  }, [fundData.user_id, fundData.mode]);
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const handleDeposit = async (data: DepositForm) => {
    setLoading(true);
    try {
      const amount = Number(data.amount);
      // Use New Deposit Settings (local)
      const activePercentage = depositActivePct;
      const reservePercentage = depositReservePct;
      const toActive = amount * (activePercentage / 100);
      const toReserve = amount * (reservePercentage / 100);

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

      const { error: historyError } = await supabase.from('transaction_history').insert({
        user_id: userId,
        mode: fundData.mode,
        transaction_type: 'deposit',
        to_fund: 'mixed',
        amount: amount,
        balance_before: fundData.total_capital,
        balance_after: newTotalCapital,
        description: `${t('deposited')} ${formatCurrency(amount)} (${activePercentage}% to Active, ${reservePercentage}% to Reserve)`,
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

      const { error: historyError } = await supabase.from('transaction_history').insert({
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
      
      if (isTransferBetweenAccounts) {
        // Handle transfer between main and sub accounts
        if (!data.targetUser || !data.targetUserType) {
          throw new Error('Please select target account');
        }

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
          const targetSubUser = subUsers.find(su => su.id === data.targetUser);
          if (!targetSubUser) throw new Error('Target sub-user not found');
          
          const { data: subFund, error } = await supabase
            .from('fund_data')
            .select('*')
            .eq('user_id', userId)
            .eq('mode', fundData.mode)
            .eq('sub_user_name', targetSubUser.name)
            .single();
          
          if (error) throw error;
          targetFundData = subFund;
        }

        // Update source fund
        const newFromValue = fundData[fromField] - amount;
        const newSourceTotal = fundData.total_capital - amount;

        const { error: sourceFundError } = await supabase
          .from('fund_data')
          .update({
            [fromField]: newFromValue,
            total_capital: newSourceTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', fundData.id);

        if (sourceFundError) throw sourceFundError;

        // Update target fund
        const newToValue = targetFundData[toField] + amount;
        const newTargetTotal = targetFundData.total_capital + amount;

        const { error: targetFundError } = await supabase
          .from('fund_data')
          .update({
            [toField]: newToValue,
            total_capital: newTargetTotal,
            updated_at: new Date().toISOString(),
          })
          .eq('id', targetFundData.id);

        if (targetFundError) throw targetFundError;

        // Record transactions for both accounts
        const sourceAccountName = subUserName || 'Main Account';
        const targetAccountName = data.targetUserType === 'main' ? 'Main Account' : subUsers.find(su => su.id === data.targetUser)?.name || 'Unknown';

        const { error: sourceHistoryError } = await supabase.from('transaction_history').insert({
          user_id: userId,
          mode: fundData.mode,
          transaction_type: 'transfer',
          from_fund: fromField.replace('_fund', ''),
          to_fund: toField.replace('_fund', ''),
          amount: amount,
          balance_before: fundData.total_capital,
          balance_after: newSourceTotal,
          description: `Transferred ${formatCurrency(amount)} from ${sourceAccountName} ${fromField.replace('_', ' ')} to ${targetAccountName} ${toField.replace('_', ' ')}`,
          sub_user_name: subUserName,
        });

        if (sourceHistoryError) throw sourceHistoryError;

        const { error: targetHistoryError } = await supabase.from('transaction_history').insert({
          user_id: userId,
          mode: fundData.mode,
          transaction_type: 'transfer',
          from_fund: fromField.replace('_fund', ''),
          to_fund: toField.replace('_fund', ''),
          amount: amount,
          balance_before: targetFundData.total_capital,
          balance_after: newTargetTotal,
          description: `Received ${formatCurrency(amount)} from ${sourceAccountName} ${fromField.replace('_', ' ')} to ${toField.replace('_', ' ')}`,
          sub_user_name: data.targetUserType === 'sub' ? targetAccountName : null,
        });

        if (targetHistoryError) throw targetHistoryError;

        toast({
          title: "Success",
          description: `Transfer completed successfully to ${targetAccountName}`,
        });
      } else {
        // Handle internal transfer within same account
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

        const { error: historyError } = await supabase.from('transaction_history').insert({
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
      }

      transferForm.reset();
      setIsTransferBetweenAccounts(false);
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
            {t('fundManagement')}
          </div>
          <div className="flex items-center gap-2">
            <ProfitManagementSettings 
              fundData={fundData}
              subUserName={subUserName}
              onUpdate={onUpdate}
            />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showSettings && (
          <div className="mb-4">
            <DepositSettings 
              fundData={fundData} 
              subUserName={subUserName}
              onUpdate={onUpdate}
            />
          </div>
        )}
        
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="deposit">{t('deposit')}</TabsTrigger>
            <TabsTrigger value="withdraw">{t('withdraw')}</TabsTrigger>
            <TabsTrigger value="transfer">{t('transfer')}</TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <form onSubmit={depositForm.handleSubmit(handleDeposit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount" className="text-foreground">{t('amount')}</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  {...depositForm.register('amount', { required: true, min: 0.01 })}
                  placeholder="1000.00"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {t('willBeSplit')}: {depositActivePct}% {t('toActiveFund')}, {depositReservePct}% {t('toReserveFund')}
                  </span>
                  <DepositSettings 
                    fundData={fundData}
                    subUserName={subUserName}
                    onUpdate={onUpdate}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('processing') : t('deposit')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4">
            <form onSubmit={withdrawForm.handleSubmit(handleWithdraw)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="withdraw-from" className="text-foreground">{t('from')}</Label>
                <Select onValueChange={(value) => withdrawForm.setValue('from', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder={`${t('from')} ${t('activeFund').toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active_fund">
                      {t('activeFund')} ({formatCurrency(fundData.active_fund)})
                    </SelectItem>
                    <SelectItem value="reserve_fund">
                      {t('reserveFund')} ({formatCurrency(fundData.reserve_fund)})
                    </SelectItem>
                    <SelectItem value="profit_fund">
                      {t('profitFund')} ({formatCurrency(fundData.profit_fund)})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdraw-amount" className="text-foreground">{t('amount')}</Label>
                <Input
                  id="withdraw-amount"
                  type="number"
                  step="0.01"
                  {...withdrawForm.register('amount', { required: true, min: 0.01 })}
                  placeholder="500.00"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('processing') : t('withdraw')}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="transfer-between-accounts"
                  checked={isTransferBetweenAccounts}
                  onChange={(e) => setIsTransferBetweenAccounts(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="transfer-between-accounts" className="text-sm">
                  {t('transferBetweenAccounts')}
                </Label>
              </div>

              <form onSubmit={transferForm.handleSubmit(handleTransfer)} className="space-y-4">
                {isTransferBetweenAccounts && (
                  <div className="space-y-2">
                    <Label className="text-foreground">{t('to')} Account</Label>
                    <Select onValueChange={(value) => {
                      const [type, userId] = value.split(':');
                      transferForm.setValue('targetUserType', type as any);
                      transferForm.setValue('targetUser', userId);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="main:">{t('mainAccount')}</SelectItem>
                        {subUsers.map((subUser) => (
                          <SelectItem key={subUser.id} value={`sub:${subUser.id}`}>
                            {t('subAccount')}: {subUser.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfer-from" className="text-foreground">{t('fromFund')}</Label>
                    <Select onValueChange={(value) => transferForm.setValue('from', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('from')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active_fund">
                          {t('activeFund')} ({formatCurrency(fundData.active_fund)})
                        </SelectItem>
                        <SelectItem value="reserve_fund">
                          {t('reserveFund')} ({formatCurrency(fundData.reserve_fund)})
                        </SelectItem>
                        <SelectItem value="profit_fund">
                          {t('profitFund')} ({formatCurrency(fundData.profit_fund)})
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="transfer-to" className="text-foreground">{t('toFund')}</Label>
                    <Select onValueChange={(value) => transferForm.setValue('to', value as any)}>
                      <SelectTrigger>
                        <SelectValue placeholder={t('to')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active_fund">{t('activeFund')}</SelectItem>
                        <SelectItem value="reserve_fund">{t('reserveFund')}</SelectItem>
                        <SelectItem value="profit_fund">{t('profitFund')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="transfer-amount" className="text-foreground">{t('amount')}</Label>
                  <Input
                    id="transfer-amount"
                    type="number"
                    step="0.01"
                    {...transferForm.register('amount', { required: true, min: 0.01 })}
                    placeholder="200.00"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? t('processing') : t('transfer')}
                </Button>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FundManagement;