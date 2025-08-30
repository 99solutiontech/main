import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { History, Edit } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';

interface TradingRecord {
  id: string;
  user_id: string;
  mode: string;
  type: string;
  details: string;
  amount?: number;
  end_balance: number;
  trade_date?: string;
  created_at: string;
}

interface TradingHistoryProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

interface EditFormData {
  details: string;
  amount: number;
  end_balance: number;
  type: string;
}

interface EditTradingRecordProps {
  record: TradingRecord;
  onUpdate: () => void;
}

const EditTradingRecord = ({ record, onUpdate }: EditTradingRecordProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const form = useForm<EditFormData>({
    defaultValues: {
      details: record.details,
      amount: record.amount || 0,
      end_balance: record.end_balance,
      type: record.type,
    },
  });

  const updateRecord = async (data: EditFormData) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('trading_history')
        .update({
          details: data.details,
          profit_loss: data.amount,
          end_balance: data.end_balance,
          type: data.type,
        })
        .eq('id', record.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Trading record updated successfully',
      });

      setOpen(false);
      onUpdate();
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
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trading Record</DialogTitle>
          <DialogDescription>
            Modify the trading record details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(updateRecord)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              {...form.register('type', { required: true })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="profit">Win</option>
              <option value="loss">Loss</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="details">Details</Label>
            <Input
              id="details"
              {...form.register('details')}
              placeholder="Trade details"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Profit/Loss Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...form.register('amount', { required: true, valueAsNumber: true })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_balance">End Balance</Label>
            <Input
              id="end_balance"
              type="number"
              step="0.01"
              {...form.register('end_balance', { required: true, valueAsNumber: true })}
              placeholder="0.00"
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

const TradingHistory = ({ userId, mode, subUserName }: TradingHistoryProps) => {
  const [history, setHistory] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { format } = useCurrency();

  const loadHistory = async () => {
    try {
      const query = supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode);

      if (subUserName) {
        query.eq('sub_user_name', subUserName);
      } else {
        query.is('sub_user_name', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      // Normalize data: prefer details, fallback to notes; map profit_loss to amount for UI
      const mappedData = (data || []).map((record: any) => ({
        ...record,
        details: record.details || record.notes || '',
        amount: record.profit_loss ?? record.amount,
      }));
      setHistory(mappedData);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [userId, mode, subUserName]);

  useEffect(() => {
    const handleRefresh = () => {
      loadHistory();
    };

    window.addEventListener('refreshTradingData', handleRefresh);

    // Direct realtime subscription to ensure instant updates
    const channel = supabase
      .channel(`trading_history_rt_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_history', filter: `user_id=eq.${userId}` },
        () => handleRefresh()
      )
      .subscribe();
    
    return () => {
      window.removeEventListener('refreshTradingData', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [userId]);


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getTypeColor = (type: string) => {
    const tLower = (type || '').toLowerCase();
    switch (tLower) {
      case 'profit':
      case 'deposit':
        return 'text-green-500';
      case 'loss':
      case 'withdraw':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('tradingHistory')}
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          {t('tradingHistory')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No trading history yet
            </div>
          ) : (
            history.map((record) => (
              <div key={record.id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                  <Badge variant={(record.type?.toLowerCase() === 'profit') ? 'default' : (record.type?.toLowerCase() === 'loss' ? 'destructive' : 'secondary')}>
                      {(record.type?.toLowerCase() === 'profit') ? t('win') : (record.type?.toLowerCase() === 'loss' ? t('loss') : record.type)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(record.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {format(record.end_balance)}
                    </span>
                    <EditTradingRecord record={record} onUpdate={loadHistory} />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {record.details}
                </div>
                {record.amount && (
                  <div className={`text-sm font-semibold ${getTypeColor(record.type)}`}>
                    {record.amount > 0 ? '+' : ''}{format(record.amount)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingHistory;