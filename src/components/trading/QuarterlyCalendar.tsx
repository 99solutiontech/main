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

interface QuarterlyCalendarProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

const QuarterlyCalendar = ({ userId, mode, subUserName }: QuarterlyCalendarProps) => {
  const [currentQuarter, setCurrentQuarter] = useState(new Date());
  const [tradingData, setTradingData] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTradingData();
  }, [userId, mode, currentQuarter, subUserName]);

  const loadTradingData = async () => {
    try {
      const startOfQuarter = getStartOfQuarter(currentQuarter);
      const endOfQuarter = getEndOfQuarter(currentQuarter);

      const query = supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .in('type', ['Win', 'Loss'])
        .gte('created_at', startOfQuarter.toISOString())
        .lte('created_at', endOfQuarter.toISOString());

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

  const getStartOfQuarter = (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  };

  const getEndOfQuarter = (date: Date) => {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3 + 3, 0);
  };

  const getWeekStartDate = (quarterStart: Date, weekIndex: number) => {
    const weekStart = new Date(quarterStart);
    weekStart.setDate(quarterStart.getDate() + (weekIndex * 7));
    return weekStart;
  };

  const getWeekEndDate = (weekStart: Date) => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return weekEnd;
  };

  const getTradesForWeek = (weekStart: Date, weekEnd: Date) => {
    return tradingData.filter(trade => {
      const tradeDate = new Date(trade.trade_date || trade.created_at);
      return tradeDate >= weekStart && tradeDate <= weekEnd;
    });
  };

  const navigateQuarter = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentQuarter);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 3);
    } else {
      newDate.setMonth(newDate.getMonth() + 3);
    }
    setCurrentQuarter(newDate);
  };

  const renderQuarterlyGrid = () => {
    const startOfQuarter = getStartOfQuarter(currentQuarter);
    const weeks = [];

    for (let i = 0; i < 12; i++) {
      const weekStart = getWeekStartDate(startOfQuarter, i);
      const weekEnd = getWeekEndDate(weekStart);
      const weekTrades = getTradesForWeek(weekStart, weekEnd);
      
      const wins = weekTrades.filter(t => t.type === 'Win');
      const losses = weekTrades.filter(t => t.type === 'Loss');
      const totalWins = wins.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalLosses = losses.reduce((sum, t) => sum + (t.amount || 0), 0);
      const netPnL = totalWins + totalLosses;
      
      const balanceBefore = weekTrades.length > 0 ? weekTrades[0].end_balance - (weekTrades[0].amount || 0) : 0;
      const balanceAfter = weekTrades.length > 0 ? weekTrades[weekTrades.length - 1].end_balance : balanceBefore;
      
      const isCurrentWeek = () => {
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay() + 1);
        return weekStart.toDateString() === currentWeekStart.toDateString();
      };

      weeks.push(
        <TooltipProvider key={i}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`
                  h-24 border rounded-lg p-2 flex flex-col items-center justify-center text-xs relative cursor-pointer
                  ${isCurrentWeek() ? 'ring-2 ring-primary' : ''}
                  ${weekTrades.length > 0 
                    ? (netPnL >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30') 
                    : 'bg-background'
                  }
                  hover:bg-muted transition-colors
                `}
              >
                <span className="font-medium text-xs text-foreground">
                  Week {i + 1}
                </span>
                <span className="text-xs text-muted-foreground">
                  {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                {weekTrades.length > 0 && (
                  <>
                    <div className={`
                      text-xs font-semibold mt-1
                      ${netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                    `}>
                      {formatCurrency(Math.abs(netPnL))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(balanceAfter)}
                    </div>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {weekTrades.length > 0 && (
              <TooltipContent className="bg-popover border p-3 rounded-lg shadow-lg">
                <div className="space-y-2 text-sm">
                  <div className="font-semibold text-foreground">
                    Week {i + 1}: {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                  </div>
                  <div className="space-y-1">
                    <div className="text-foreground">Start Balance: {formatCurrency(balanceBefore)}</div>
                    <div className="text-foreground">End Balance: {formatCurrency(balanceAfter)}</div>
                    <div className={`font-medium ${netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      P&L: {formatCurrency(netPnL)}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <div className="text-green-600 dark:text-green-400">Wins: {wins.length} ({formatCurrency(totalWins)})</div>
                    <div className="text-red-600 dark:text-red-400">Losses: {losses.length} ({formatCurrency(Math.abs(totalLosses))})</div>
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
    }

    return weeks;
  };

  const calculateQuarterlyStats = () => {
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

  const stats = calculateQuarterlyStats();
  const startOfQuarter = getStartOfQuarter(currentQuarter);
  const endOfQuarter = getEndOfQuarter(currentQuarter);
  const quarterNumber = Math.floor(currentQuarter.getMonth() / 3) + 1;

  if (loading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            Quarterly Trading Calendar
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
          Quarterly Trading Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quarter Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateQuarter('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-foreground">
            Q{quarterNumber} {currentQuarter.getFullYear()} - Week View
          </h3>
          <Button variant="outline" size="sm" onClick={() => navigateQuarter('next')}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quarterly Grid - 12 weeks */}
        <div className="grid grid-cols-4 gap-3">
          {renderQuarterlyGrid()}
        </div>

        {/* Quarterly Summary */}
        <div className="pt-4 border-t space-y-2">
          <div className="text-sm font-medium text-foreground">Quarterly Summary</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground">Wins:</span>
                <span className="text-green-600 dark:text-green-400">{stats.winCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">Losses:</span>
                <span className="text-red-600 dark:text-red-400">{stats.lossCount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground">Win Rate:</span>
                <span className="text-foreground">{stats.winRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">Net P&L:</span>
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

export default QuarterlyCalendar;