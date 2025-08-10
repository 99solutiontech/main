import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Users, Plus, Trash2, DollarSign, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface SubUserManagerProps {
  userId: string;
  currentMode: 'diamond' | 'gold';
  onSubUserSelect: (subUser: SubUser | null) => void;
  selectedSubUser: SubUser | null;
  selectedSubUserName?: string | null;
  onResetSubUser?: (subUserName: string) => void;
  onCreated?: () => void;
}

interface CreateSubUserForm {
  name: string;
  mode: 'diamond' | 'gold';
  initial_capital: number;
}

const SubUserManager = ({ userId, currentMode, onSubUserSelect, selectedSubUser, selectedSubUserName, onResetSubUser, onCreated }: SubUserManagerProps) => {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const form = useForm<CreateSubUserForm>({
    defaultValues: {
      mode: currentMode,
      initial_capital: 10000,
    }
  });

  useEffect(() => {
    loadSubUsers();
  }, [userId]);

  const loadSubUsers = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const subUsersData = data?.map((fund: any) => ({
        id: fund.id,
        name: fund.sub_user_name || `Account ${fund.mode.toUpperCase()}`,
        mode: fund.mode,
        initial_capital: fund.initial_capital,
        total_capital: fund.total_capital,
        active_fund: fund.active_fund,
        reserve_fund: fund.reserve_fund,
        profit_fund: fund.profit_fund,
        created_at: fund.created_at,
      })) || [];
      
      setSubUsers(subUsersData);
    } catch (error: any) {
      console.error('Error loading sub users:', error);
    }
  };

  const createSubUser = async (data: CreateSubUserForm) => {
    setLoading(true);
    try {
      const newFundData = {
        user_id: userId,
        mode: data.mode,
        sub_user_name: data.name,
        initial_capital: data.initial_capital,
        total_capital: data.initial_capital,
        active_fund: data.initial_capital * 0.4,
        reserve_fund: data.initial_capital * 0.6,
        profit_fund: 0,
        target_reserve_fund: data.initial_capital * 0.6,
        profit_dist_active: 50,
        profit_dist_reserve: 25,
        profit_dist_profit: 25,
        lot_base_capital: 1000,
        lot_base_lot: 0.4,
      };

      const { data: fundResult, error } = await (supabase as any)
        .from('fund_data')
        .insert(newFundData)
        .select()
        .single();

      if (error) throw error;

      // Add initial history record
      await (supabase as any).from('trading_history').insert({
        user_id: userId,
        mode: data.mode,
        sub_user_name: data.name,
        type: 'profit',
        details: `Initial capital set to $${data.initial_capital.toLocaleString()} for ${data.name}`,
        start_balance: data.initial_capital,
        end_balance: data.initial_capital,
        profit_loss: 0,
      });

      toast({
        title: t('success'),
        description: `Sub account "${data.name}" created successfully`,
      });

      form.reset();
      loadSubUsers();
      onCreated?.();
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

  const deleteSubUser = async (subUserId: string) => {
    if (!confirm('Are you sure you want to delete this sub account?')) return;

    try {
      const { error } = await (supabase as any)
        .from('fund_data')
        .delete()
        .eq('id', subUserId);

      if (error) throw error;

      toast({
        title: t('success'),
        description: "Sub account deleted successfully",
      });

      if (selectedSubUser?.id === subUserId) {
        onSubUserSelect(null);
      }
      
      loadSubUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetSubUserData = async (fundId: string, mode: 'diamond' | 'gold', subUserName: string | null) => {
    try {
      // 1) Delete trading history for this sub user (handle null vs non-null names)
      let th = supabase
        .from('trading_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode);
      if (subUserName) th = th.eq('sub_user_name', subUserName); else th = th.is('sub_user_name', null);
      await th;

      // 2) Delete transaction history for this sub user
      let tx = supabase
        .from('transaction_history')
        .delete()
        .eq('user_id', userId)
        .eq('mode', mode);
      if (subUserName) tx = tx.eq('sub_user_name', subUserName); else tx = tx.is('sub_user_name', null);
      await tx;

      // 3) Reset balances in fund_data but KEEP the sub account record
      const { error: updateError } = await supabase
        .from('fund_data')
        .update({
          initial_capital: 0,
          total_capital: 0,
          active_fund: 0,
          reserve_fund: 0,
          profit_fund: 0,
          target_reserve_fund: 0,
        })
        .eq('id', fundId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      toast({
        title: t('success'),
        description: `Sub account "${subUserName ?? 'Main'}" has been reset. Balances cleared, account kept.`,
      });

      // Trigger refresh of transaction history and components
      window.dispatchEvent(new Event('refreshTransactions'));
      window.dispatchEvent(new Event('refreshFundData'));
      window.dispatchEvent(new Event('refreshTradingData'));
      loadSubUsers();
    } catch (error: any) {
      toast({
        title: t('error'),
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          {t('subAccounts')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="list">{t('accounts')}</TabsTrigger>
            <TabsTrigger value="create">{t('createNew')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="space-y-4">
            {subUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No sub accounts found
              </div>
            ) : (
              <div className="space-y-2">
                {subUsers.map((subUser) => (
                  <div
                    key={subUser.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSubUser?.id === subUser.id 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => onSubUserSelect(subUser)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{subUser.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(subUser.total_capital)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={subUser.mode === 'diamond' ? 'default' : 'secondary'}>
                          {subUser.mode}
                        </Badge>
                        {subUser.name && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Reset all data for "${subUser.name}"? This will clear trading history, transaction history, and set all balances to 0. The sub account will be kept.`)) {
                                resetSubUserData(subUser.id, subUser.mode, subUser.name || null);
                              }
                            }}
                            className="h-8 w-8 p-0"
                            title="Reset All Data"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSubUser(subUser.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="create">
            <form onSubmit={form.handleSubmit(createSubUser)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('accountName')}</Label>
                <Input
                  id="name"
                  {...form.register('name', { required: true })}
                  placeholder="e.g., Personal Trading, Backup Account"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mode">{t('mode')}</Label>
                <Select
                  value={form.watch('mode')}
                  onValueChange={(value: 'diamond' | 'gold') => form.setValue('mode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diamond">Diamond</SelectItem>
                    <SelectItem value="gold">Gold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="initial_capital">Initial Capital (USD)</Label>
                <Input
                  id="initial_capital"
                  type="number"
                  min="100"
                  step="0.01"
                  {...form.register('initial_capital', { required: true, min: 100 })}
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                <Plus className="h-4 w-4 mr-2" />
                {loading ? t('creating') : t('createSubAccount')}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SubUserManager;