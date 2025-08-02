import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEffect } from 'react';

const ThemeToggle = () => {
  const { themeMode, setThemeMode } = useAppTheme();
  const { t } = useLanguage();

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode(themeMode === 'light' ? 'dark' : 'light');
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} className="h-8 w-8 p-0">
      {themeMode === 'light' ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span className="sr-only">{t('toggleTheme')}</span>
    </Button>
  );
};

export default ThemeToggle;