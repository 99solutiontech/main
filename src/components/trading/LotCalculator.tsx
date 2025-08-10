import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, TrendingUp } from 'lucide-react';
import LotSizeSettings from './LotSizeSettings';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FundData {
  id: string;
  user_id: string;
  mode: 'diamond' | 'gold';
  sub_user_name?: string | null;
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
  // risk_percent is stored in user_settings, optional for runtime
  risk_percent?: number;
}

interface LotCalculatorProps {
  fundData: FundData;
  onUpdate: () => void;
}

const LotCalculator = ({ fundData, onUpdate }: LotCalculatorProps) => {
  const { t } = useLanguage();
  const [riskPercent, setRiskPercent] = useState<number>(fundData.risk_percent || 40);

  useEffect(() => {
    const loadRisk = async () => {
      try {
        let query = supabase
          .from('user_settings')
          .select('lot_size_settings')
          .eq('user_id', fundData.user_id)
          .eq('mode', fundData.mode);
        const subName = (fundData as any).sub_user_name || null;
        if (subName) query = query.eq('sub_user_name', subName); else query = query.is('sub_user_name', null);
        const { data } = await query.maybeSingle();
        const rp = (data as any)?.lot_size_settings?.risk_percent;
        if (rp != null) setRiskPercent(Number(rp));
        else setRiskPercent(fundData.risk_percent || 40);
      } catch {
        setRiskPercent(fundData.risk_percent || 40);
      }
    };
    loadRisk();
  }, [fundData.id]);
  
  const calculateRecommendedLot = () => {
    if (!fundData.lot_base_capital || fundData.lot_base_capital <= 0) return 0;
    const ratio = fundData.active_fund / fundData.lot_base_capital;
    return ratio * fundData.lot_base_lot;
  };

  const calculateRiskAmount = () => {
    return (fundData.active_fund * riskPercent) / 100;
  };

  const recommendedLot = calculateRecommendedLot();
  const riskAmount = calculateRiskAmount();

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Calculator className="h-5 w-5" />
          {t('riskAndLotSizeCalculator')}
        </CardTitle>
        <CardDescription>
          Recommended lot size and risk amount based on current active fund
        </CardDescription>
        <LotSizeSettings fundData={fundData} onUpdate={onUpdate} />
      </CardHeader>
      <CardContent className="text-center space-y-6">
        {/* Lot Size Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calculator className="h-4 w-4" />
            {t('recommendedLotSize')}
          </div>
          <div className="text-3xl font-bold text-primary">
            {recommendedLot.toFixed(2)} lot
          </div>
          <div className="text-sm text-muted-foreground">
            Base: {fundData.lot_base_lot} lot per ${fundData.lot_base_capital.toLocaleString()}
          </div>
        </div>
        
        {/* Risk Amount Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            {t('riskAmount')} ({riskPercent}% of Active Fund)
          </div>
          <div className="text-2xl font-bold text-destructive">
            ${riskAmount.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {t('maximumRecommendedRiskPerTrade')}
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-foreground">{t('activeFundLabel')}</span>
              <span className="text-foreground">${fundData.active_fund.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">{t('baseCapitalLabel')}</span>
              <span className="text-foreground">${fundData.lot_base_capital.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">{t('baseLotLabel')}</span>
              <span className="text-foreground">{fundData.lot_base_lot} lot</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground">{t('riskPercentageLabel')}</span>
              <span className="text-foreground">{riskPercent}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LotCalculator;