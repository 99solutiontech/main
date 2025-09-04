import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage, Language } from '@/contexts/LanguageContext';

const LanguageSelector = () => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'lo', name: 'Lao', nativeName: 'ລາວ' },
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  ];

  const currentLanguage = languages.find(lang => lang.code === language) || languages[1];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-10 px-4 py-2 w-full justify-between bg-background border-input hover:bg-accent hover:text-accent-foreground"
        >
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="font-medium">{currentLanguage.nativeName}</span>
            <span className="text-muted-foreground text-sm">({currentLanguage.name})</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-popover border border-border shadow-md z-50"
      >
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`cursor-pointer hover:bg-accent hover:text-accent-foreground ${
              language === lang.code ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{lang.nativeName}</span>
              <span className="text-muted-foreground text-sm">({lang.name})</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;