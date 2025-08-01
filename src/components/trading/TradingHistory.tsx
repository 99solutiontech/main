import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';

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
}

const TradingHistory = ({ userId, mode }: TradingHistoryProps) => {
  const [history, setHistory] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId, mode]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Win':
      case 'Deposit':
        return 'text-green-500';
      case 'Loss':
      case 'Withdraw':
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
            Trading History
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
          Trading History
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
                    <Badge variant={record.type === 'Win' ? 'default' : record.type === 'Loss' ? 'destructive' : 'secondary'}>
                      {record.type}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(record.created_at)}
                    </span>
                  </div>
                  <span className="font-mono text-sm">
                    {formatCurrency(record.end_balance)}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {record.details}
                </div>
                {record.amount && (
                  <div className={`text-sm font-semibold ${getTypeColor(record.type)}`}>
                    {record.amount > 0 ? '+' : ''}{formatCurrency(record.amount)}
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