import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Users, Plus, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SubUserManager from '@/components/trading/SubUserManager';

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

interface SubUserSelectorProps {
  userId: string;
  currentMode: 'diamond' | 'gold';
  selectedSubUser: SubUser | null;
  onSubUserSelect: (subUser: SubUser | null) => void;
}

const SubUserSelector = ({ userId, currentMode, selectedSubUser, onSubUserSelect }: SubUserSelectorProps) => {
  const [subUsers, setSubUsers] = useState<SubUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);

  useEffect(() => {
    loadSubUsers();
  }, [userId, currentMode]);

  const loadSubUsers = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('fund_data')
        .select('*')
        .eq('user_id', userId)
        .eq('mode', currentMode)
        .not('sub_user_name', 'is', null)
        .order('sub_user_name');

      if (error) throw error;
      
      // Map database data to SubUser interface
      const mappedSubUsers = (data || []).map(item => ({
        id: item.id,
        name: item.sub_user_name || 'Unnamed',
        mode: item.mode as 'diamond' | 'gold',
        initial_capital: item.initial_capital,
        total_capital: item.total_capital,
        active_fund: item.active_fund,
        reserve_fund: item.reserve_fund,
        profit_fund: item.profit_fund,
        created_at: item.created_at,
      }));
      
      setSubUsers(mappedSubUsers);
    } catch (error) {
      console.error('Error loading sub users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubUserChange = (value: string) => {
    if (value === 'main') {
      onSubUserSelect(null);
    } else {
      const subUser = subUsers.find(su => su.id === value);
      onSubUserSelect(subUser || null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={selectedSubUser?.id || 'main'} onValueChange={handleSubUserChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Account" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="main">
            <div className="flex items-center justify-between w-full">
              <span>Main</span>
              <Badge variant="outline" className="ml-1 text-xs">Primary</Badge>
            </div>
          </SelectItem>
          {subUsers.map((subUser) => (
            <SelectItem key={subUser.id} value={subUser.id}>
              <div className="flex items-center justify-between w-full">
                <span>{subUser.name}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatCurrency(subUser.total_capital)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Dialog open={showManager} onOpenChange={setShowManager}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0">
            <Settings className="h-3 w-3" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sub User Management</DialogTitle>
            <DialogDescription>
              Manage your sub-accounts for {currentMode} mode. Each sub-account has separate funds and trading data.
            </DialogDescription>
          </DialogHeader>
          <SubUserManager 
            userId={userId}
            currentMode={currentMode}
            selectedSubUser={selectedSubUser}
            onSubUserSelect={(subUser) => {
              onSubUserSelect(subUser);
              loadSubUsers(); // Refresh the list
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubUserSelector;