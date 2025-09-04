import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { TrendingUp } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  InteractionItem,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface TradingRecord {
  id: string;
  user_id: string;
  end_balance: number;
  created_at: string;
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

interface MultiAccountCapitalGrowthProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUsers: SubUser[];
}

const colors = [
  'rgb(59, 130, 246)',   // Blue
  'rgb(34, 197, 94)',    // Green  
  'rgb(168, 85, 247)',   // Purple
  'rgb(245, 158, 11)',   // Amber
  'rgb(239, 68, 68)',    // Red
  'rgb(20, 184, 166)',   // Teal
  'rgb(249, 115, 22)',   // Orange
  'rgb(219, 39, 119)',   // Pink
];

const MultiAccountCapitalGrowth = ({ userId, mode, subUsers }: MultiAccountCapitalGrowthProps) => {
  const [chartData, setChartData] = useState<any>({ labels: [], datasets: [] });
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();
  const { format } = useCurrency();

  useEffect(() => {
    loadChartData();
  }, [userId, mode, subUsers]);

  useEffect(() => {
    const channel = supabase
      .channel('multi_account_capital_growth_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_history', filter: `user_id=eq.${userId}` },
        () => loadChartData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, mode, subUsers]);

  const loadChartData = async () => {
    try {
      setLoading(true);
      const datasets: any[] = [];
      const today = new Date().toLocaleDateString();

      // Process each account
      for (let i = 0; i < subUsers.length; i++) {
        const account = subUsers[i];
        const query = supabase
          .from('trading_history')
          .select('end_balance, created_at')
          .eq('user_id', userId)
          .eq('mode', mode)
          .order('created_at', { ascending: true });

        // Filter by sub user
        if (account.name === 'Main Account') {
          query.is('sub_user_name', null);
        } else {
          query.eq('sub_user_name', account.name);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error loading data for ${account.name}:`, error);
          continue;
        }

        const accountData: { x: string; y: number }[] = [];

        if (data && data.length > 0) {
          // Add initial capital as starting point
          const firstDate = new Date(data[0].created_at);
          firstDate.setDate(firstDate.getDate() - 1);
          accountData.push({
            x: firstDate.toLocaleDateString(),
            y: account.initial_capital
          });

          // Add all trading data points
          data.forEach(record => {
            accountData.push({
              x: new Date(record.created_at).toLocaleDateString(),
              y: record.end_balance
            });
          });

          // Extend line to current day with last known balance
          const lastBalance = data[data.length - 1].end_balance;
          const lastDate = new Date(data[data.length - 1].created_at).toLocaleDateString();
          
          if (lastDate !== today) {
            accountData.push({
              x: today,
              y: lastBalance
            });
          }
        } else {
          // For accounts with no trading history, show line from account creation to today
          const accountCreationDate = new Date(account.created_at).toLocaleDateString();
          
          // Add starting point
          accountData.push({
            x: accountCreationDate,
            y: account.total_capital
          });

          // Add current day point if different from creation date
          if (accountCreationDate !== today) {
            accountData.push({
              x: today,
              y: account.total_capital
            });
          }
        }

        datasets.push({
          label: account.name,
          data: accountData,
          borderColor: colors[i % colors.length],
          backgroundColor: colors[i % colors.length] + '20',
          tension: 0.1,
          pointRadius: 3,
          pointHoverRadius: 6,
          borderWidth: 2,
        });
      }

      setChartData({
        labels: [], // Let Chart.js handle the x-axis labels automatically
        datasets: datasets
      });
    } catch (error) {
      console.error('Error loading multi-account chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          color: 'rgb(156, 163, 175)',
        },
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            return `${context.dataset.label}: ${format(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: t('date'),
          color: 'rgb(156, 163, 175)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          maxTicksLimit: 10,
        },
        grid: {
          color: 'rgb(55, 65, 81)',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: t('balance'),
          color: 'rgb(156, 163, 175)',
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          callback: function(value: any) {
            return format(value);
          }
        },
        grid: {
          color: 'rgb(55, 65, 81)',
        },
      },
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('multiAccountCapitalGrowth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData.datasets || chartData.datasets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('multiAccountCapitalGrowth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            {t('noTradingDataAvailable')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('multiAccountCapitalGrowth')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-96">
          <Line data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

export default MultiAccountCapitalGrowth;