import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';

interface TradingRecord {
  id: string;
  type: string;
  amount?: number;
  end_balance: number;
  trade_date?: string;
  created_at: string;
  details: string;
}

interface TradingCalendarProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

const TradingCalendar = ({ userId, mode, subUserName }: TradingCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tradingData, setTradingData] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    loadTradingData();
  }, [userId, mode, currentDate, subUserName]);

  const loadTradingData = async () => {
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();

      const query = supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .in('type', ['profit', 'loss'])
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (subUserName) {
        query.eq('sub_user_name', subUserName);
      } else {
        query.is('sub_user_name', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      // Map the data to include details field from notes
      const mappedData = (data || []).map(record => ({
        ...record,
        details: record.notes || '',
        amount: record.profit_loss
      }));
      setTradingData(mappedData);
    } catch (error) {
      console.error('Error loading trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('trading_calendar_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_history', filter: `user_id=eq.${userId}` },
        (payload) => {
          const rec: any = (payload as any).new || (payload as any).old;
          if (!rec) { loadTradingData(); return; }
          if (rec.mode !== mode) return;
          if ((subUserName || null) !== (rec.sub_user_name || null)) return;
          loadTradingData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, mode, subUserName, currentDate]);

  // Also refresh when other parts of the app dispatch a refresh event
  useEffect(() => {
    const handler = () => loadTradingData();
    window.addEventListener('refreshTradingData', handler);
    return () => window.removeEventListener('refreshTradingData', handler);
  }, [userId, mode, subUserName, currentDate]);

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    return firstDay === 0 ? 6 : firstDay - 1; // Convert Sunday=0 to Monday=0
  };

  const getTradeForDate = (day: number) => {
    return tradingData.find(trade => {
      const tradeDate = new Date(trade.trade_date || trade.created_at);
      return tradeDate.getDate() === day &&
             tradeDate.getMonth() === currentDate.getMonth() &&
             tradeDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const trade = getTradeForDate(day);
      const isWeekend = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay() % 6 === 0;
      
      days.push(
        <TooltipProvider key={day}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`
                  aspect-square border rounded-lg p-1 flex flex-col items-center justify-center text-xs relative cursor-pointer
                  ${isWeekend ? 'bg-muted opacity-60' : 'bg-background'}
                  ${trade ? (trade.type?.toLowerCase() === 'profit' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30') : ''}
                  hover:bg-muted transition-colors
                `}
              >
                <span className="font-medium text-foreground">{day}</span>
                {trade && (
                  <div className={`
                    text-xs font-semibold mt-1
                    ${trade.type?.toLowerCase() === 'profit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                  `}>
                    {trade.amount !== undefined ? formatCurrency(Math.abs(trade.amount)) : trade.type}
                  </div>
                )}
              </div>
            </TooltipTrigger>
            {trade && (
              <TooltipContent className="bg-popover border p-3 rounded-lg shadow-lg">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-foreground">{new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString()}</div>
                  <div className="space-y-1">
                    <div className="text-foreground">Start Balance: {formatCurrency(trade.end_balance - (trade.amount || 0))}</div>
                    <div className="text-foreground">End Balance: {formatCurrency(trade.end_balance)}</div>
                    <div className={`font-medium ${trade.type?.toLowerCase() === 'profit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      P&L: {trade.amount !== undefined ? formatCurrency(Math.abs(trade.amount)) : 'No amount'}
                    </div>
                  </div>
                  {trade.details && <div className="text-muted-foreground">{trade.details}</div>}
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }

    return days;
  };

  const calculateMonthlyStats = () => {
    const wins = tradingData.filter(t => t.type?.toLowerCase() === 'profit');
    const losses = tradingData.filter(t => t.type?.toLowerCase() === 'loss');
    const totalWins = wins.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalLosses = losses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netPnL = totalWins + totalLosses;

    return {
      winCount: wins.length,
      lossCount: losses.length,
      totalWins,
      totalLosses,
      netPnL,
      winRate: wins.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0
    };
  };

  const stats = calculateMonthlyStats();

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Trading Calendar
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
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5" />
          {t('monthlyTradingCalendar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {renderCalendarGrid()}
        </div>

        {/* Monthly Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium text-foreground">{t('monthlySummary')}</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground">{t('wins')}:</span>
                <span className="text-green-600 dark:text-green-400">{stats.winCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">{t('losses')}:</span>
                <span className="text-red-600 dark:text-red-400">{stats.lossCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground">{t('winRate')}:</span>
                <span className="text-foreground">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">{t('netPnL')}:</span>
                <span className={stats.netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                  {formatCurrency(stats.netPnL)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingCalendar;