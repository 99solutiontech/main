import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
import { BarChart3 } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyData {
  month: string;
  profit: number;
  trades: number;
}

interface MonthlyGrowthChartProps {
  userId: string;
  mode: 'diamond' | 'gold';
}

const MonthlyGrowthChart = ({ userId, mode }: MonthlyGrowthChartProps) => {
  const [chartData, setChartData] = useState<any>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [userId, mode, selectedYear]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      // Get available years
      const { data: yearsData, error: yearsError } = await (supabase as any)
        .from('trading_history')
        .select('created_at')
        .eq('user_id', userId)
        .eq('mode', mode);

      if (yearsError) throw yearsError;

      const years = [...new Set(
        (yearsData || []).map((record: any) => new Date(record.created_at).getFullYear().toString())
      )].sort().reverse();
      
      setAvailableYears(years);

      // Get monthly data for selected year
      const startDate = `${selectedYear}-01-01`;
      const endDate = `${selectedYear}-12-31`;

      const { data, error } = await (supabase as any)
        .from('trading_history')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', mode)
        .gte('created_at', startDate)
        .lte('created_at', endDate)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (!data || data.length === 0) {
        setChartData(null);
        setLoading(false);
        return;
      }

      // Process data by month
      const monthlyData: { [key: string]: MonthlyData } = {};
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];

      // Initialize all months
      months.forEach((month, index) => {
        monthlyData[month] = {
          month,
          profit: 0,
          trades: 0
        };
      });

      // Aggregate data by month
      data.forEach((record: any) => {
        const recordDate = new Date(record.created_at);
        const monthIndex = recordDate.getMonth();
        const monthName = months[monthIndex];
        
        if (record.type === 'Win' || record.type === 'Loss') {
          monthlyData[monthName].profit += record.amount || 0;
          monthlyData[monthName].trades += 1;
        }
      });

      const chartLabels = months;
      const profitData = months.map(month => monthlyData[month].profit);
      const volumeData = months.map(month => monthlyData[month].trades);

      setChartData({
        labels: chartLabels,
        datasets: [
          {
            label: 'Monthly P&L ($)',
            data: profitData,
            backgroundColor: profitData.map(profit => 
              profit >= 0 
                ? 'hsla(var(--primary), 0.8)' 
                : 'hsla(var(--destructive), 0.8)'
            ),
            borderColor: profitData.map(profit => 
              profit >= 0 
                ? 'hsl(var(--primary))' 
                : 'hsl(var(--destructive))'
            ),
            borderWidth: 1,
            yAxisID: 'y',
          },
          {
            label: 'Trade Volume',
            data: volumeData,
            backgroundColor: 'hsla(var(--accent), 0.6)',
            borderColor: 'hsl(var(--accent))',
            borderWidth: 1,
            yAxisID: 'y1',
            type: 'line' as const,
          },
        ],
      });
    } catch (error) {
      console.error('Error loading monthly chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'hsl(var(--foreground))',
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            if (context.datasetIndex === 0) {
              return `P&L: $${context.parsed.y.toLocaleString()}`;
            } else {
              return `Trades: ${context.parsed.y}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: 'hsl(var(--foreground))',
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        grid: {
          color: 'hsla(var(--border), 0.8)',
        },
        ticks: {
          color: 'hsl(var(--foreground))',
          callback: function(value) {
            return '$' + Number(value).toLocaleString();
          },
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          color: 'hsl(var(--foreground))',
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Growth Analysis
          </CardTitle>
          {availableYears.length > 0 && (
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : chartData ? (
            <Bar data={chartData} options={options} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No trading data available for {selectedYear}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyGrowthChart;