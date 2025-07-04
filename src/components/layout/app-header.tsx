
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, Settings, LogInIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import AppSidebarContent, { type NavItem } from "./app-sidebar-content";
import ThemeSwitcher from "@/components/theme-switcher"; // Import the new ThemeSwitcher
import logger from "@/lib/logger";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource?: 'oidc' | 'local';
}

export default function AppHeader({
  navItems,
  user,
  isLoadingUser
}: {
  navItems: NavItem[];
  user: AppUser | null;
  isLoadingUser: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.debug("AppHeader RENDERED", "isLoadingUser:", isLoadingUser, "User state (from props) is now:", user);
  }, [user, isLoadingUser]);


  const handleLogout = async () => {
    // Direct navigation for logout to ensure full page reload cycle
    window.location.href = '/api/auth/logout';
  };

  const getAvatarFallback = () => {
    if (!user) return 'U';
    if (user.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2);
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const avatarSrc = user?.avatarUrl || `https://placehold.co/40x40.png?text=${getAvatarFallback()}`;
  const avatarHint = user?.avatarUrl && !user.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder";


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="flex flex-col p-0 bg-sidebar text-sidebar-foreground w-72">
             <AppSidebarContent navItems={navItems} isMobile={true} user={user} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex items-center gap-4">
          <ThemeSwitcher /> {/* Use the new ThemeSwitcher component */}
          {isLoadingUser ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user && user.id ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={avatarSrc}
                      alt={user.name || 'User'}
                      data-ai-hint={avatarHint}
                    />
                    <AvatarFallback>{getAvatarFallback()}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name || user.email || "User"}</p>
                    {user.email && user.name && <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/admin/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/admin/settings')} disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button asChild variant="outline">
                <Link href="/login">
                    <LogInIcon className="mr-2 h-4 w-4" /> Login
                </Link>
             </Button>
          )}
        </div>
      </div>
    </header>
  );
}
