
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

// Define a simple user type for the application
interface AppUser {
  id: string;
  name?: string;
  email?: string;
  picture?: string; // For OIDC avatar
  // preferredUsername?: string; // From openapi User schema
  // isAdmin?: boolean; // From openapi User schema
}

const useThemeToggle = () => {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(storedTheme);
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  return { theme, toggleTheme };
};


export default function AppHeader({ navItems }: { navItems: NavItem[] }) {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeToggle();
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const fetchUser = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch('/api/auth/user', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUser(data); // data can be null if not authenticated
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Failed to fetch user session", error);
      setUser(null);
    } finally {
      setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Effect to refetch user on navigation to ensure state is fresh after login/logout redirects
  const pathname = usePathname();
  useEffect(() => {
    fetchUser();
  }, [pathname, fetchUser]);


  const handleLogout = async () => {
    router.push('/api/auth/logout');
  };
  
  const handleLogin = () => {
    router.push('/login');
  };

  const getAvatarFallback = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

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
          ) : user && user.id ? ( // Check for user.id to ensure it's a valid user object
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={user.picture || `https://placehold.co/40x40.png?text=${getAvatarFallback()}`} 
                      alt={user.name || 'User'} 
                      data-ai-hint="user avatar" 
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
                <DropdownMenuItem onClick={() => router.push('/admin/profile')}> {/* Placeholder for profile page */}
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/admin/settings')}> {/* Placeholder for settings page */}
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
             <Button asChild variant="outline" onClick={handleLogin}>
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
