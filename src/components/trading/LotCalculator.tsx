import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

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

interface LotCalculatorProps {
  fundData: FundData;
}

const LotCalculator = ({ fundData }: LotCalculatorProps) => {
  const calculateRecommendedLot = () => {
    if (!fundData.lot_base_capital || fundData.lot_base_capital <= 0) return 0;
    
    const ratio = fundData.active_fund / fundData.lot_base_capital;
    return ratio * fundData.lot_base_lot;
  };

  const recommendedLot = calculateRecommendedLot();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Lot Size Calculator
        </CardTitle>
        <CardDescription>
          Recommended lot size based on current active fund
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div>
          <div className="text-3xl font-bold text-primary">
            {recommendedLot.toFixed(2)} lot
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            Base: {fundData.lot_base_lot} lot per ${fundData.lot_base_capital.toLocaleString()}
          </div>
        </div>
        
        <div className="pt-4 border-t">
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span>Active Fund:</span>
              <span>${fundData.active_fund.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Capital:</span>
              <span>${fundData.lot_base_capital.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Lot:</span>
              <span>{fundData.lot_base_lot} lot</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LotCalculator;