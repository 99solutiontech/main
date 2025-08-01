import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUpDown } from 'lucide-react';

interface FundTransaction {
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
}

interface FundTransactionHistoryProps {
  userId: string;
  mode: 'diamond' | 'gold';
}

const FundTransactionHistory = ({ userId, mode }: FundTransactionHistoryProps) => {
  const [transactions, setTransactions] = useState<FundTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, [userId, mode]);

  const loadTransactions = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('fund_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
        return 'text-blue-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <Badge variant="default" className="bg-green-100 text-green-800">Deposit</Badge>;
      case 'withdraw':
        return <Badge variant="destructive">Withdraw</Badge>;
      case 'transfer':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Transfer</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            Fund Transaction History
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
          <ArrowUpDown className="h-5 w-5" />
          Fund Transaction History
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
                  <span className="font-mono text-sm">
                    {formatCurrency(transaction.balance_after)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {transaction.description}
                </div>
                <div className={`text-sm font-semibold ${getTransactionColor(transaction.transaction_type)}`}>
                  {transaction.transaction_type === 'deposit' ? '+' : transaction.transaction_type === 'withdraw' ? '-' : ''}
                  {formatCurrency(transaction.amount)}
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