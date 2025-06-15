
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
import { Menu, User, LogOut, Settings, Moon, Sun, LogInIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect, useCallback } from "react";
import AppSidebarContent, { type NavItem } from "./app-sidebar-content";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  picture?: string; 
  isAdmin?: boolean; 
  authSource?: 'oidc' | 'local'; 
}

const useThemeToggle = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(storedTheme);
      if (storedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };
  return { theme, toggleTheme };
};


export default function AppHeader({ navItems }: { navItems: NavItem[] }) {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeToggle();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const pathname = usePathname(); 

  const fetchUser = useCallback(async () => {
    setIsLoadingSession(true);
    let newUserData: AppUser | null = null;
    try {
      const res = await fetch(`/api/auth/user?t=${Date.now()}`, { 
        cache: 'no-store',
        credentials: 'include', 
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data && data.id) { 
          newUserData = data;
        } else {
          newUserData = null;
        }
      } else {
        newUserData = null;
      }
    } catch (error) {
      newUserData = null;
    } finally {
      setUser(newUserData);
      setIsLoadingSession(false);
      console.log(`[AppHeader] fetchUser: Processing complete. isLoadingSession is now false. User state will update to:`, newUserData);
    }
  }, []); 

  useEffect(() => {
    console.log(`[AppHeader] Pathname changed to: ${pathname}. Triggering user fetch.`);
    fetchUser();
  }, [pathname, fetchUser]);

  useEffect(() => {
    console.log("[AppHeader RENDERED] isLoadingSession:", isLoadingSession, "User state is now:", user);
  }, [user, isLoadingSession]);


  const handleLogout = async () => {
    router.push('/api/auth/logout');
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

  const avatarSrc = user?.picture || `https://placehold.co/40x40.png?text=${getAvatarFallback()}`;

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
             <AppSidebarContent navItems={navItems} isMobile={true} />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
        <div className="ml-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          {isLoadingSession ? (
            <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
          ) : user && user.id ? ( 
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={avatarSrc}
                      alt={user.name || 'User'} 
                      data-ai-hint={user.picture ? "user avatar" : "user avatar placeholder"}
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
