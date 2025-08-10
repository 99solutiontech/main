import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';
import { TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import EconomicNewsBar from './EconomicNewsBar';
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
  type: string;
  end_balance: number;
  created_at: string;
}

interface CapitalGrowthChartProps {
  userId: string;
  mode: 'diamond' | 'gold';
  subUserName?: string;
}

const CapitalGrowthChart = ({ userId, mode, subUserName }: CapitalGrowthChartProps) => {
  const [chartData, setChartData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  const loadChartData = async () => {
    try {
      const query = supabase
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode);

      if (subUserName) {
        query.eq('sub_user_name', subUserName);
      } else {
        query.is('sub_user_name', null);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      const labels = data.map((record: any) => 
        new Date(record.created_at).toLocaleDateString('en-GB')
      );
      
      const balances = data.map((record: any) => record.end_balance);

      setChartData({
        labels,
        datasets: [
          {
            label: 'Total Capital',
            data: balances,
            borderColor: '#ffffff', // White line
            backgroundColor: 'hsla(255, 255%, 100%, 0.1)', // White with low opacity
            tension: 0.4,
            fill: true,
          },
        ],
      });
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, [userId, mode, subUserName]);

  useEffect(() => {
    const handleRefresh = () => {
      loadChartData();
    };

    window.addEventListener('refreshTradingData', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshTradingData', handleRefresh);
    };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('capital_growth_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trading_history', filter: `user_id=eq.${userId}` },
        () => {
          loadChartData();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, mode, subUserName]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `Capital: $${context.parsed.y.toLocaleString()}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'hsla(var(--border), 0.8)',
        },
        ticks: {
          maxTicksLimit: 7,
          color: '#ffffff',
        },
      },
      y: {
        display: true,
        grid: {
          color: 'hsla(var(--border), 0.8)',
        },
        ticks: {
          color: '#ffffff',
          callback: function(value) {
            return '$' + Number(value).toLocaleString();
          },
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <>
      <EconomicNewsBar />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t('capitalGrowth')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : chartData ? (
              <Line data={chartData} options={options} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No trading data available yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default CapitalGrowthChart;