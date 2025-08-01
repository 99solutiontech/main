import React, { createContext, useContext, useEffect } from 'react';

export type TradingMode = 'diamond' | 'gold';

interface ThemeContextType {
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode; tradingMode: TradingMode; onModeChange: (mode: TradingMode) => void }> = ({ 
  children, 
  tradingMode, 
  onModeChange 
}) => {
  useEffect(() => {
    // Apply theme classes to document root
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove('theme-diamond', 'theme-gold');
    
    // Add new theme class
    root.classList.add(`theme-${tradingMode}`);
  }, [tradingMode]);

  return (
    <ThemeContext.Provider value={{ tradingMode, setTradingMode: onModeChange }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};