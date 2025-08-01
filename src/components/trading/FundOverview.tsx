import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
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
  
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pnl = fundData.total_capital - fundData.initial_capital;
  const pnlPercent = (pnl / fundData.initial_capital) * 100;

  return (
    <div className="space-y-6">
      {/* Total Capital Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-center">{t('totalCapital')}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-4xl font-bold mb-2">{formatCurrency(fundData.total_capital)}</div>
          <div className="flex items-center justify-center gap-2">
            {pnl > 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : pnl < 0 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : null}
            <span className={`font-semibold ${pnl > 0 ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
              {pnl > 0 ? '+' : ''}{formatCurrency(pnl)} ({pnlPercent.toFixed(2)}%)
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
            <div className="text-2xl font-bold">{formatCurrency(fundData.active_fund)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('reserveFund')}</CardTitle>
            <CardDescription>{t('safetyCapital')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.reserve_fund)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('profitFund')}</CardTitle>
            <CardDescription>{t('earnedProfits')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(fundData.profit_fund)}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FundOverview;