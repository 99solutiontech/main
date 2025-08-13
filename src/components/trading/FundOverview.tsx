import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface FundData {
  id: string;
  user_id: string;
  mode: 'diamond' | 'gold';
  initial_capital: number;
  total_capital: number;
  active_fund: number;
  reserve_fund: number;
  profit_fund: number;
  target_reserve_fund: number;
  profit_dist_active: number;
  profit_dist_reserve: number;
  profit_dist_profit: number;
  lot_base_capital: number;
  lot_base_lot: number;
}

interface FundOverviewProps {
  fundData: FundData;
}

const FundOverview = ({ fundData }: FundOverviewProps) => {
  const { t } = useLanguage();
  const { format } = useCurrency();


  // Calculate actual total capital from individual funds
  const actualTotalCapital = fundData.active_fund + fundData.reserve_fund + fundData.profit_fund;
  
  // Calculate P&L only from trading results (excludes deposits/transfers)
  // This represents the actual profit/loss from trading activities
  const tradingOnlyTotal = fundData.initial_capital + fundData.profit_fund;
  const pnl = tradingOnlyTotal - fundData.initial_capital;
  const pnlPercent = fundData.initial_capital > 0 ? (pnl / fundData.initial_capital) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Total Capital Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('totalCapital')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold mb-2">{format(actualTotalCapital)}</div>
          <div className="flex items-center justify-center gap-2">
            {pnl > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : pnl < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span className={`font-semibold ${pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {pnl > 0 ? '+' : ''}{format(pnl)} ({pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Fund Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('activeFund')}</CardTitle>
            <CardDescription>{t('tradingCapital')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(fundData.active_fund)}</div>
            {(() => {
              // Calculate the initial active fund allocation based on profit distribution settings
              const initialActiveFundAllocation = (fundData.initial_capital * (fundData.profit_dist_active || 40)) / 100;
              // Check if there's not enough reserve fund to maintain the initial active fund allocation
              const shortfall = Math.max(0, initialActiveFundAllocation - fundData.active_fund);
              const shouldShowWarning = shortfall > 0 && fundData.reserve_fund < shortfall;
              
              return shouldShowWarning && (
                <div className="mt-2 text-sm text-red-500 font-medium">
                  ⚠️ {t('lowActiveFundWarning')}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reserveFund')}</CardTitle>
            <CardDescription>{t('safetyCapital')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(fundData.reserve_fund)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('profitFund')}</CardTitle>
            <CardDescription>{t('earnedProfits')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{format(fundData.profit_fund)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FundOverview;