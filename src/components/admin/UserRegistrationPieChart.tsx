import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserRegistrationPieChartProps {
  users: Array<{
    id: string;
    user_id: string;
    created_at: string;
    is_active: boolean;
    registration_status?: string;
  }>;
  userStats: Array<{
    user_id: string;
    last_active: string;
  }>;
}

export const UserRegistrationPieChart = ({ users, userStats }: UserRegistrationPieChartProps) => {
  // Calculate stats
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const newThisMonth = users.filter(user => {
    const createdDate = new Date(user.created_at);
    return createdDate.getMonth() === currentMonth && 
           createdDate.getFullYear() === currentYear;
  }).length;

  const activeUsers = users.filter(user => {
    const userStat = userStats.find(stat => stat.user_id === user.user_id);
    const lastActiveDate = new Date(userStat?.last_active || user.created_at);
    return user.is_active && lastActiveDate > twoWeeksAgo;
  }).length;

  const offlineUsers = users.filter(user => {
    const userStat = userStats.find(stat => stat.user_id === user.user_id);
    const lastActiveDate = new Date(userStat?.last_active || user.created_at);
    return user.is_active && lastActiveDate <= twoWeeksAgo;
  }).length;

  const data = [
    {
      name: 'New Registrations (This Month)',
      value: newThisMonth,
      color: '#0EA5E9'
    },
    {
      name: 'Active Users',
      value: activeUsers,
      color: '#10B981'
    },
    {
      name: 'Offline Users (2+ weeks)',
      value: offlineUsers,
      color: '#F59E0B'
    }
  ];

  const COLORS = ['#0EA5E9', '#10B981', '#F59E0B'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Activity Overview</CardTitle>
        <CardDescription>Monthly registrations, active and offline users</CardDescription>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [value, 'Users']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};