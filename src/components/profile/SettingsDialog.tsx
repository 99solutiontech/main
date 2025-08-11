import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import LanguageSelector from '@/components/LanguageSelector';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency, CurrencyUnit } from '@/contexts/CurrencyContext';

interface SettingsForm {
  language: string;
  currency_unit: CurrencyUnit;
}

export const SettingsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) => {
  const { toast } = useToast();
  const { language, setLanguage } = useLanguage();
  const { unit, setUnit } = useCurrency();
  const form = useForm<SettingsForm>({ defaultValues: { language, currency_unit: unit } });

  useEffect(() => {
    if (!open) return;
    form.reset({ language, currency_unit: unit });
  }, [open, language, unit]);

  const onSubmit = async (values: SettingsForm) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('profiles')
        .update({ language: values.language, currency_unit: values.currency_unit })
        .eq('user_id', uid);
      if (error) throw error;
      setLanguage(values.language as any);
      setUnit(values.currency_unit);
      toast({ title: 'Settings saved' });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Language and currency preferences</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            {/* Reuse existing selector inside settings */}
            <LanguageSelector />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.watch('currency_unit')} onValueChange={(v) => form.setValue('currency_unit', v as CurrencyUnit)}>
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="USDCENT">USD Cent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
