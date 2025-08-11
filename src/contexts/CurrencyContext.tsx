import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CurrencyUnit = 'USD' | 'USDCENT';

interface CurrencyContextType {
  unit: CurrencyUnit;
  setUnit: (u: CurrencyUnit) => void;
  // Convert a base USD amount to display number based on selected unit
  toDisplay: (usdAmount: number) => number;
  // Convert a display number back to base USD
  fromDisplay: (displayAmount: number) => number;
  // Format a USD amount using the current unit with label
  format: (usdAmount: number, opts?: { showLabel?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [unit, setUnitState] = useState<CurrencyUnit>('USD');

  // Load saved preference from profile or localStorage
  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const uid = session?.user?.id;
        if (uid) {
          const { data } = await supabase
            .from('profiles')
            .select('currency_unit')
            .eq('user_id', uid)
            .maybeSingle();
          const unitFromDb = (data as any)?.currency_unit as CurrencyUnit | undefined;
          if (unitFromDb === 'USD' || unitFromDb === 'USDCENT') {
            setUnitState(unitFromDb);
            localStorage.setItem('currency_unit', unitFromDb);
            return;
          }
        }
      } catch {}
      const cached = localStorage.getItem('currency_unit') as CurrencyUnit | null;
      if (cached === 'USD' || cached === 'USDCENT') setUnitState(cached);
    };
    load();
  }, []);

  const setUnit = async (u: CurrencyUnit) => {
    setUnitState(u);
    try {
      localStorage.setItem('currency_unit', u);
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        await supabase.from('profiles').update({ currency_unit: u }).eq('user_id', uid);
      }
    } catch {}
  };

  const toDisplay = useMemo(() => (usdAmount: number) => {
    if (!Number.isFinite(usdAmount)) return 0;
    return unit === 'USDCENT' ? usdAmount * 100 : usdAmount;
  }, [unit]);

  const fromDisplay = useMemo(() => (displayAmount: number) => {
    if (!Number.isFinite(displayAmount)) return 0;
    return unit === 'USDCENT' ? displayAmount / 100 : displayAmount;
  }, [unit]);

  const format = useMemo(() => (usdAmount: number, opts?: { showLabel?: boolean }) => {
    const showLabel = opts?.showLabel ?? false;
    const disp = toDisplay(usdAmount);
    const formatted = disp.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (unit === 'USDCENT') return showLabel ? `${formatted} cent` : formatted;
    return showLabel ? `$${formatted}` : `$${formatted}`;
  }, [toDisplay, unit]);

  return (
    <CurrencyContext.Provider value={{ unit, setUnit, toDisplay, fromDisplay, format }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
