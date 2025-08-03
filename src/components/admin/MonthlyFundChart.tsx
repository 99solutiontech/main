import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MonthlyFundChartProps {}

export const MonthlyFundChart = ({}: MonthlyFundChartProps) => {
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMonthlyFundData();
  }, []);

  const loadMonthlyFundData = async () => {
    try {
      // Get transaction history for fund additions
      const { data: transactions, error } = await supabase
        .from('transaction_history')
        .select('*')
        .in('transaction_type', ['deposit', 'transfer_to_active', 'transfer_to_reserve'])
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get fund data for total amounts by mode
      const { data: fundData, error: fundError } = await supabase
        .from('fund_data')
        .select('mode, total_capital, created_at');

      if (fundError) throw fundError;

      // Process data by month
      const monthlyMap = new Map();
      const currentYear = new Date().getFullYear();

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        monthlyMap.set(monthKey, {
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          diamondFunds: 0,
          goldFunds: 0,
          diamondAdded: 0,
          goldAdded: 0
        });
      }

      // Add transaction data (monthly additions)
      transactions?.forEach((transaction: any) => {
        const date = new Date(transaction.created_at);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthlyMap.has(monthKey)) {
          const entry = monthlyMap.get(monthKey);
          if (transaction.mode === 'diamond') {
            entry.diamondAdded += transaction.amount || 0;
          } else if (transaction.mode === 'gold') {
            entry.goldAdded += transaction.amount || 0;
          }
        }
      });

      // Add current fund totals
      fundData?.forEach((fund: any) => {
        const currentMonthKey = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        if (monthlyMap.has(currentMonthKey)) {
          const entry = monthlyMap.get(currentMonthKey);
          if (fund.mode === 'diamond') {
            entry.diamondFunds += fund.total_capital || 0;
          } else if (fund.mode === 'gold') {
            entry.goldFunds += fund.total_capital || 0;
          }
        }
      });

      setMonthlyData(Array.from(monthlyMap.values()));
    } catch (error) {
      console.error('Error loading monthly fund data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Fund Analysis</CardTitle>
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
        <CardTitle>Monthly Fund Analysis</CardTitle>
        <CardDescription>Fund additions and total fund amounts by mode</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="diamondAdded" fill="#3B82F6" name="Diamond Added" />
              <Bar dataKey="goldAdded" fill="#F59E0B" name="Gold Added" />
              <Bar dataKey="diamondFunds" fill="#1E40AF" name="Diamond Total" />
              <Bar dataKey="goldFunds" fill="#D97706" name="Gold Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};