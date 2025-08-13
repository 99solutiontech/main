import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TransactionHistory {
  id: string;
  user_id: string;
  mode: string;
  transaction_type: string;
  from_fund?: string;
  to_fund?: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  created_at: string;
  sub_user_name?: string;
}

interface FundTransactionHistoryProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

const FundTransactionHistory = ({ userId, mode, subUserName }: FundTransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { format } = useCurrency();

  useEffect(() => {
    loadTransactions();
  }, [userId, mode, subUserName]);

  useEffect(() => {
    const handleRefresh = () => {
      loadTransactions();
    };

    // Listen for refresh events and also subscribe directly to realtime
    window.addEventListener('refreshTransactions', handleRefresh);
    window.addEventListener('refreshFundData', handleRefresh);
    window.addEventListener('refreshTradingData', handleRefresh);

    const channel = supabase
      .channel(`transaction_history_rt_${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transaction_history', filter: `user_id=eq.${userId}` },
        () => handleRefresh()
      )
      .subscribe();
    
    return () => {
      window.removeEventListener('refreshTransactions', handleRefresh);
      window.removeEventListener('refreshFundData', handleRefresh);
      window.removeEventListener('refreshTradingData', handleRefresh);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('transaction_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode);

      if (subUserName) {
        query = query.eq('sub_user_name', subUserName);
      } else {
        query = query.is('sub_user_name', null);
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error loading transactions:', error);
        setTransactions([]);
      } else {
        setTransactions(data || []);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
        return 'text-green-500';
      case 'withdraw':
        return 'text-red-500';
      case 'transfer':
      case 'transfer_in':
      case 'transfer_out':
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t('deposit')}</Badge>;
      case 'withdraw':
        return <Badge variant="destructive">Withdraw</Badge>;
      case 'transfer':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">{t('transfer')}</Badge>;
      case 'transfer_in':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Transfer In</Badge>;
      case 'transfer_out':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Transfer Out</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getAmountPrefix = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'transfer_in':
        return '+';
      case 'withdraw':
      case 'transfer_out':
        return '-';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <ArrowUpDown className="h-5 w-5" />
            {t('fundTransactionHistory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <ArrowUpDown className="h-5 w-5" />
          {t('fundTransactionHistory')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fund transactions yet
            </div>
          ) : (
            transactions.map((transaction) => (
              <div key={transaction.id} className="border-b border-border pb-3 last:border-b-0">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {getTransactionBadge(transaction.transaction_type)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(transaction.created_at)}
                    </span>
                  </div>
                  <span className="font-mono text-sm text-foreground">
                    {format(transaction.balance_after)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {transaction.description}
                </div>
                <div className={`text-sm font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                  {getAmountPrefix(transaction.transaction_type)}
                  {format(transaction.amount)}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FundTransactionHistory;