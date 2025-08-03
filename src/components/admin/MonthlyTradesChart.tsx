import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyTradesChartProps {}

export const MonthlyTradesChart = ({}: MonthlyTradesChartProps) => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyTradesData();
  }, []);

  const loadMonthlyTradesData = async () => {
    try {
      // Get all trading history
      const { data: trades, error } = await supabase
        .from('trading_history')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Process data by month
      const monthlyMap = new Map();

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyMap.set(monthKey, {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          diamondTrades: 0,
          goldTrades: 0
        });
      }

      // Count trades by month and mode
      trades?.forEach((trade: any) => {
        const date = new Date(trade.created_at);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthlyMap.has(monthKey)) {
          const entry = monthlyMap.get(monthKey);
          if (trade.mode === 'diamond') {
            entry.diamondTrades += 1;
          } else if (trade.mode === 'gold') {
            entry.goldTrades += 1;
          }
        }
      });

      setMonthlyData(Array.from(monthlyMap.values()));
    } catch (error) {
      console.error('Error loading monthly trades data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trading Activity</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Trading Activity</CardTitle>
        <CardDescription>Trade count comparison between Diamond and Gold modes</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="diamondTrades" 
                stroke="#3B82F6" 
                strokeWidth={3}
                name="Diamond Trades"
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="goldTrades" 
                stroke="#F59E0B" 
                strokeWidth={3}
                name="Gold Trades"
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};