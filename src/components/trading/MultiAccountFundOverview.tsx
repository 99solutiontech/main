import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

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

interface MultiAccountFundOverviewProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUsers: SubUser[];
  onAccountClick: (accountName: string) => void;
}

const MultiAccountFundOverview = ({ userId, mode, subUsers, onAccountClick }: MultiAccountFundOverviewProps) => {
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const { t } = useLanguage();
  const { format } = useCurrency();

  useEffect(() => {
    loadTotalDeposits();
  }, [userId, mode, subUsers]);

  const loadTotalDeposits = async () => {
    try {
      let totalDeposits = 0;

      // Get deposits for main account
      const { data: mainDeposits } = await supabase
        .from('transaction_history')
        .select('amount')
        .eq('user_id', userId)
        .eq('mode', mode)
        .eq('transaction_type', 'deposit')
        .is('sub_user_name', null);

      if (mainDeposits) {
        totalDeposits += mainDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
      }

      // Get deposits for each sub account
      for (const subUser of subUsers) {
        if (subUser.name !== 'Main Account') {
          const { data: subDeposits } = await supabase
            .from('transaction_history')
            .select('amount')
            .eq('user_id', userId)
            .eq('mode', mode)
            .eq('transaction_type', 'deposit')
            .eq('sub_user_name', subUser.name);

          if (subDeposits) {
            totalDeposits += subDeposits.reduce((sum, deposit) => sum + deposit.amount, 0);
          }
        }
      }

      setTotalDeposits(totalDeposits);
    } catch (error) {
      console.error('Error loading total deposits:', error);
    }
  };

  // Calculate aggregated totals
  const aggregatedTotals = subUsers.reduce(
    (acc, user) => ({
      totalCapital: acc.totalCapital + user.total_capital,
      activeFund: acc.activeFund + user.active_fund,
      reserveFund: acc.reserveFund + user.reserve_fund,
      profitFund: acc.profitFund + user.profit_fund,
      initialCapital: acc.initialCapital + user.initial_capital,
    }),
    { totalCapital: 0, activeFund: 0, reserveFund: 0, profitFund: 0, initialCapital: 0 }
  );

  const pnl = aggregatedTotals.totalCapital - (totalDeposits || aggregatedTotals.initialCapital);
  const pnlPercent = totalDeposits > 0 ? (pnl / totalDeposits) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Aggregated Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {t('totalPortfolio')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="text-4xl font-bold">
              {format(aggregatedTotals.totalCapital)}
            </div>
            <div className={`flex items-center justify-center gap-2 text-lg font-semibold ${
              pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {pnl >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {format(Math.abs(pnl))} ({pnlPercent.toFixed(2)}%)
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card className="bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  {t('activeFund')}
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-300">
                  {format(aggregatedTotals.activeFund)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 dark:bg-green-950/50 border-green-200 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {t('reserveFund')}
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-300">
                  {format(aggregatedTotals.reserveFund)}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                  {t('profitFund')}
                </div>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-300">
                  {format(aggregatedTotals.profitFund)}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Individual Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>{t('individualAccounts')} ({subUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subUsers.map((account) => {
              const accountPnl = account.total_capital - account.initial_capital;
              const accountPnlPercent = account.initial_capital > 0 ? (accountPnl / account.initial_capital) * 100 : 0;
              
              return (
                <Card key={account.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAccountClick(account.name)}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-2xl font-bold">
                        {format(account.total_capital)}
                      </div>
                      
                      <div className={`flex items-center gap-1 text-sm font-medium ${
                        accountPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {accountPnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {format(Math.abs(accountPnl))} ({accountPnlPercent.toFixed(2)}%)
                      </div>
                      
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">{t('active')}</div>
                          <div className="font-medium">{format(account.active_fund)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t('reserve')}</div>
                          <div className="font-medium">{format(account.reserve_fund)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t('profit')}</div>
                          <div className="font-medium">{format(account.profit_fund)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MultiAccountFundOverview;