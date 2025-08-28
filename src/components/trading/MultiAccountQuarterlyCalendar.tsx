import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';

interface TradingRecord {
  id: string;
  type: string;
  amount?: number;
  end_balance: number;
  trade_date?: string;
  created_at: string;
  details: string;
  sub_user_name?: string;
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

interface MultiAccountQuarterlyCalendarProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUsers: SubUser[];
}

const MultiAccountQuarterlyCalendar = ({ userId, mode, subUsers }: MultiAccountQuarterlyCalendarProps) => {
  const [currentQuarter, setCurrentQuarter] = useState(new Date());
  const [tradingData, setTradingData] = useState<TradingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { format } = useCurrency();

  useEffect(() => {
    loadTradingData();
  }, [userId, mode, currentQuarter, subUsers]);

  const loadTradingData = async () => {
    try {
      const startOfQuarter = getStartOfQuarter(currentQuarter);
      const endOfQuarter = getEndOfQuarter(currentQuarter);
      let allTradingData: TradingRecord[] = [];

      // Load data for main account
      const { data: mainData, error: mainError } = await supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .in('type', ['profit', 'loss'])
        .gte('created_at', startOfQuarter.toISOString())
        .lte('created_at', endOfQuarter.toISOString())
        .is('sub_user_name', null);

      if (mainData && !mainError) {
        const mappedMainData = mainData.map(record => ({
          ...record,
          details: record.notes || '',
          amount: record.profit_loss,
          sub_user_name: 'Main Account'
        }));
        allTradingData = [...allTradingData, ...mappedMainData];
      }

      // Load data for each sub account
      for (const subUser of subUsers) {
        if (subUser.name !== 'Main Account') {
          const { data: subData, error: subError } = await supabase
            .from('trading_history')
            .select('*')
            .eq('user_id', userId)
            .eq('mode', mode)
            .in('type', ['profit', 'loss'])
            .gte('created_at', startOfQuarter.toISOString())
            .lte('created_at', endOfQuarter.toISOString())
            .eq('sub_user_name', subUser.name);

          if (subData && !subError) {
            const mappedSubData = subData.map(record => ({
              ...record,
              details: record.notes || '',
              amount: record.profit_loss,
              sub_user_name: subUser.name
            }));
            allTradingData = [...allTradingData, ...mappedSubData];
          }
        }
      }

      setTradingData(allTradingData);
    } catch (error) {
      console.error('Error loading trading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const channel = supabase
      .channel('multi_quarterly_trading_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_history', filter: `user_id=eq.${userId}` },
        () => loadTradingData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mode, subUsers, currentQuarter]);

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
      
      const wins = weekTrades.filter(t => t.type?.toLowerCase() === 'profit');
      const losses = weekTrades.filter(t => t.type?.toLowerCase() === 'loss');
      const totalWins = wins.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalLosses = losses.reduce((sum, t) => sum + (t.amount || 0), 0);
      const netPnL = totalWins + totalLosses;
      
      const isCurrentWeek = () => {
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay() + 1);
        return weekStart.toDateString() === currentWeekStart.toDateString();
      };

      // Group trades by account for tooltip
      const tradesByAccount = weekTrades.reduce((acc, trade) => {
        const accountName = trade.sub_user_name || 'Main Account';
        if (!acc[accountName]) {
          acc[accountName] = { wins: [], losses: [] };
        }
        if (trade.type?.toLowerCase() === 'profit') {
          acc[accountName].wins.push(trade);
        } else {
          acc[accountName].losses.push(trade);
        }
        return acc;
      }, {} as Record<string, { wins: TradingRecord[], losses: TradingRecord[] }>);

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
                  {t('week')} {i + 1}
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
                      {format(Math.abs(netPnL))}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(tradesByAccount).length} {t('accounts')}
                    </div>
                  </>
                )}
              </div>
            </TooltipTrigger>
            {weekTrades.length > 0 && (
              <TooltipContent className="bg-popover border p-3 rounded-lg shadow-lg max-w-sm">
                <div className="space-y-3 text-sm">
                  <div className="font-semibold text-foreground border-b pb-2">
                    {t('week')} {i + 1}: {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                  </div>
                  
                  <div className="space-y-2">
                    <div className={`font-medium text-center ${netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t('totalPnL')}: {format(netPnL)}
                    </div>
                    
                    {Object.entries(tradesByAccount).map(([accountName, trades]) => {
                      const accountWins = trades.wins.reduce((sum, t) => sum + (t.amount || 0), 0);
                      const accountLosses = trades.losses.reduce((sum, t) => sum + (t.amount || 0), 0);
                      const accountPnL = accountWins + accountLosses;
                      
                      return (
                        <div key={accountName} className="border-l-2 border-muted pl-2">
                          <div className="font-medium text-foreground text-xs">
                            {accountName}
                          </div>
                          <div className={`text-xs ${accountPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            P&L: {format(accountPnL)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('wins')}: {trades.wins.length} | {t('losses')}: {trades.losses.length}
                          </div>
                        </div>
                      );
                    })}
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
    const wins = tradingData.filter(t => t.type?.toLowerCase() === 'profit');
    const losses = tradingData.filter(t => t.type?.toLowerCase() === 'loss');
    const totalWins = wins.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalLosses = losses.reduce((sum, t) => sum + (t.amount || 0), 0);
    const netPnL = totalWins + totalLosses;

    // Stats by account
    const statsByAccount = subUsers.reduce((acc, user) => {
      const accountTrades = tradingData.filter(t => 
        (user.name === 'Main Account' && t.sub_user_name === 'Main Account') || 
        (user.name !== 'Main Account' && t.sub_user_name === user.name)
      );
      const accountWins = accountTrades.filter(t => t.type?.toLowerCase() === 'profit');
      const accountLosses = accountTrades.filter(t => t.type?.toLowerCase() === 'loss');
      const accountTotalWins = accountWins.reduce((sum, t) => sum + (t.amount || 0), 0);
      const accountTotalLosses = accountLosses.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      acc[user.name] = {
        wins: accountWins.length,
        losses: accountLosses.length,
        totalWins: accountTotalWins,
        totalLosses: accountTotalLosses,
        netPnL: accountTotalWins + accountTotalLosses
      };
      return acc;
    }, {} as Record<string, any>);

    return {
      winCount: wins.length,
      lossCount: losses.length,
      totalWins,
      totalLosses,
      netPnL,
      winRate: wins.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
      statsByAccount
    };
  };

  const stats = calculateQuarterlyStats();
  const quarterNumber = Math.floor(currentQuarter.getMonth() / 3) + 1;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Calendar className="h-5 w-5" />
            {t('multiAccountQuarterlyCalendar')}
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
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calendar className="h-5 w-5" />
          {t('multiAccountQuarterlyCalendar')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quarter Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => navigateQuarter('prev')}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-lg font-semibold text-foreground">
            Q{quarterNumber} {currentQuarter.getFullYear()} - {t('allAccountsView')}
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
        <div className="pt-4 border-t space-y-4">
          <div className="text-sm font-medium text-foreground">{t('quarterlySummary')} - {t('allAccounts')}</div>
          
          {/* Overall Stats */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-foreground">{t('totalWins')}:</span>
                <span className="text-green-600 dark:text-green-400">{stats.winCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground">{t('totalLosses')}:</span>
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
                  {format(stats.netPnL)}
                </span>
              </div>
            </div>
          </div>

          {/* Per Account Stats */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-foreground">{t('byAccount')}</div>
            <div className="grid grid-cols-1 gap-2 text-xs">
              {Object.entries(stats.statsByAccount).map(([accountName, accountStats]: [string, any]) => (
                <div key={accountName} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="font-medium">{accountName}</span>
                  <div className="flex gap-4">
                    <span className="text-green-600 dark:text-green-400">W: {accountStats.wins}</span>
                    <span className="text-red-600 dark:text-red-400">L: {accountStats.losses}</span>
                    <span className={accountStats.netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {format(accountStats.netPnL)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiAccountQuarterlyCalendar;