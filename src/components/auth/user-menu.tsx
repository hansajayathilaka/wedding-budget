'use client';

import { signOut } from 'firebase/auth';
import { LogOut } from 'lucide-react';
import { getFirebase } from '@/firebase/client';
import { useUser } from './auth-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function UserMenu() {
  const user = useUser();
  const initial = (user.displayName || user.email || '?').charAt(0).toUpperCase();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex size-9 items-center justify-center rounded-full bg-secondary text-sm font-medium outline-none ring-ring focus-visible:ring-2"
      >
        {initial}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-56 truncate font-normal text-muted-foreground">
          {user.email ?? user.displayName}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => signOut(getFirebase().auth)}>
          <LogOut className="mr-2 size-4" aria-hidden /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
