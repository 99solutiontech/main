import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TradingRecord {
  id: string;
  type: string;
  amount?: number;
  end_balance: number;
  trade_date?: string;
  created_at: string;
  details: string;
}

interface WeeklyCalendarProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

const WeeklyCalendar = ({ userId, mode, subUserName }: WeeklyCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tradingData, setTradingData] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradingData();
  }, [userId, mode, currentDate, subUserName]);

  const loadTradingData = async () => {
    try {
      // Get current week range
      const startOfWeek = getStartOfWeek(currentDate);
      const endOfWeek = getEndOfWeek(currentDate);

      const query = supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .in('type', ['Win', 'Loss'])
        .gte('created_at', startOfWeek.toISOString())
        .lte('created_at', endOfWeek.toISOString());

      if (subUserName) {
        query.eq('sub_user_name', subUserName);
      } else {
        query.is('sub_user_name', null);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTradingData(data || []);
    } catch (error) {
      console.error('Error loading trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + 7;
    return new Date(d.setDate(diff));
  };

  const getTradeForDate = (date: Date) => {
    return tradingData.find(trade => {
      const tradeDate = new Date(trade.trade_date || trade.created_at);
      return tradeDate.toDateString() === date.toDateString();
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setDate(newDate.getDate() + 7);
    }
    setCurrentDate(newDate);
  };

  const renderWeeklyGrid = () => {
    const startOfWeek = getStartOfWeek(currentDate);
    const days = [];

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const trade = getTradeForDate(currentDay);
      const isToday = currentDay.toDateString() === new Date().toDateString();
      
      days.push(
        <TooltipProvider key={i}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`
                  h-24 border rounded-lg p-2 flex flex-col items-center justify-center text-xs relative cursor-pointer
                  ${isToday ? 'ring-2 ring-primary' : ''}
                  ${trade ? (trade.type === 'Win' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30') : 'bg-background'}
                  hover:bg-muted transition-colors
                `}
              >
                <span className="font-medium text-xs">
                  {currentDay.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentDay.getDate()}
                </span>
                {trade && (
                  <>
                    <div className={`
                      text-xs font-semibold mt-1
                      ${trade.type === 'Win' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                    `}>
                      {trade.amount !== undefined ? formatCurrency(Math.abs(trade.amount)) : trade.type}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(trade.end_balance)}
                    </div>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {trade && (
              <TooltipContent className="bg-popover border p-3 rounded-lg shadow-lg">
                <div className="space-y-1 text-sm">
                  <div className="font-semibold">{currentDay.toLocaleDateString()}</div>
                  <div className={`font-medium ${trade.type === 'Win' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {trade.type}: {trade.amount !== undefined ? formatCurrency(Math.abs(trade.amount)) : 'No amount'}
                  </div>
                  <div>End Balance: {formatCurrency(trade.end_balance)}</div>
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

  const calculateWeeklyStats = () => {
    const wins = tradingData.filter(t => t.type === 'Win');
    const losses = tradingData.filter(t => t.type === 'Loss');
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

  const stats = calculateWeeklyStats();
  const startOfWeek = getStartOfWeek(currentDate);
  const endOfWeek = getEndOfWeek(currentDate);

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Trading Calendar
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
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Weekly Trading Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold">
            {startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-2">
          {renderWeeklyGrid()}
        </div>

        {/* Weekly Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium">Weekly Summary</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Wins:</span>
                <span className="text-green-600 dark:text-green-400">{stats.winCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Losses:</span>
                <span className="text-red-600 dark:text-red-400">{stats.lossCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Win Rate:</span>
                <span>{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Net P&L:</span>
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

export default WeeklyCalendar;