import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { Settings } from 'lucide-react';

interface NewDepositAllocationProps {
  userId: string;
  mode: 'diamond' | 'gold';
  onUpdate?: () => void;
}

interface AllocationSettings {
  activePercentage: number;
  reservePercentage: number;
}

const NewDepositAllocation = ({ userId, mode, onUpdate }: NewDepositAllocationProps) => {
  const [open, setOpen] = useState(false);
  const [allocationSettings, setAllocationSettings] = useState<AllocationSettings>({
    activePercentage: 40,
    reservePercentage: 60
  });
  const { t } = useLanguage();

  // Load persistent allocation settings
  useEffect(() => {
    const loadSettings = () => {
      const savedSettings = localStorage.getItem(`depositSettings_${userId}_${mode}`);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setAllocationSettings(parsed);
      }
    };
    loadSettings();
  }, [userId, mode]);

  const updateAllocationSettings = (activePercent: number) => {
    const reservePercent = 100 - activePercent;
    const newSettings = {
      activePercentage: activePercent,
      reservePercentage: reservePercent
    };
    setAllocationSettings(newSettings);
    localStorage.setItem(`depositSettings_${userId}_${mode}`, JSON.stringify(newSettings));
    onUpdate?.();
  };

  const handleSave = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 w-8 p-0">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Deposit Allocation Settings</DialogTitle>
          <DialogDescription>
            Configure how new deposits are split between Active Fund and Reserve Fund.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="activePercent">Active Fund Percentage (%)</Label>
            <Input
              id="activePercent"
              type="number"
              min="0"
              max="100"
              value={allocationSettings.activePercentage}
              onChange={(e) => {
                const value = Number(e.target.value) || 0;
                if (value >= 0 && value <= 100) {
                  updateAllocationSettings(value);
                }
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservePercent">Reserve Fund Percentage (%)</Label>
            <Input
              id="reservePercent"
              type="number"
              min="0"
              max="100"
              value={allocationSettings.reservePercentage}
              onChange={(e) => {
                const value = Number(e.target.value) || 0;
                if (value >= 0 && value <= 100) {
                  updateAllocationSettings(100 - value);
                }
              }}
            />
          </div>

          <div className="text-sm">
            <p className="font-medium text-muted-foreground">
              Current Setting: {allocationSettings.activePercentage}% Active, {allocationSettings.reservePercentage}% Reserve
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDepositAllocation;