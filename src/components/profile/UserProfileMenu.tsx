import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Settings, User } from 'lucide-react';
import ProfileDialog from './ProfileDialog';
import SettingsDialog from './SettingsDialog';

export default function UserProfileMenu({ 
  onSignOut, 
  displayName, 
  showFullName = false 
}: { 
  onSignOut: () => void; 
  displayName?: string | null;
  showFullName?: boolean;
}) {
  const [openProfile, setOpenProfile] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);

  const initials = (displayName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  if (showFullName) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto p-2 flex items-center gap-2 justify-start w-full">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{displayName || 'User'}</span>
                <span className="text-xs text-muted-foreground">View Profile</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{displayName || 'User'}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setOpenProfile(true)}>
              <User className="mr-2 h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenSettings(true)}>
              <Settings className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ProfileDialog open={openProfile} onOpenChange={setOpenProfile} />
        <SettingsDialog open={openSettings} onOpenChange={setOpenSettings} />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full">
            <Avatar className="h-9 w-9">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="sr-only">Open user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="truncate">{displayName || 'User'}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setOpenProfile(true)}>
            <User className="mr-2 h-4 w-4" /> Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setOpenSettings(true)}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={openProfile} onOpenChange={setOpenProfile} />
      <SettingsDialog open={openSettings} onOpenChange={setOpenSettings} />
    </>
  );
}
