'use client';

import { User, Settings, LogOut, Crown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface UserDropdownProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function UserDropdown({ user }: UserDropdownProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2.5 p-1.5 pr-3 rounded-lg hover:bg-white/5 transition-colors outline-none focus:ring-2 focus:ring-aqua-500/50 focus:ring-offset-2 focus:ring-offset-black/40">
          <Avatar className="h-8 w-8 border border-white/10">
            <AvatarImage src={user.image || ''} alt={user.name || 'User'} />
            <AvatarFallback className="bg-gradient-to-br from-aqua-500 to-blue-600 text-white text-xs">
              {user.name?.charAt(0)?.toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-white hidden sm:block">
            {user.name || user.email?.split('@')[0]}
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-56 bg-black/90 border-white/10 backdrop-blur-xl shadow-xl"
        sideOffset={8}
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-gray-400 truncate">{user.email}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
          <Link href="/profile" className="flex items-center">
            <User className="mr-2 h-4 w-4 text-gray-400" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
          <Link href="/dashboard/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4 text-gray-400" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild className="cursor-pointer focus:bg-white/10">
          <Link href="/pricing" className="flex items-center">
            <Crown className="mr-2 h-4 w-4 text-yellow-500" />
            <span>Upgrade to Pro</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-white/10" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="cursor-pointer text-red-400 focus:text-red-400 focus:bg-red-500/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
