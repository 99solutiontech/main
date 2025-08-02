import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppTheme } from '@/contexts/AppThemeContext';

const ThemeToggle = () => {
  const { themeMode, setThemeMode } = useAppTheme();

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
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
};

export default ThemeToggle;