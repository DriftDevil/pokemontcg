
"use client"; 

import React, { useState, useEffect, useCallback } from "react";
import AppHeader from "@/components/layout/app-header";
import AppSidebarContent, { type NavItem } from "@/components/layout/app-sidebar-content";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, FileText, CreditCard, Layers, ShoppingBag, LibraryBig } from "lucide-react";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource?: 'oidc' | 'local';
}

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "dashboard", isAdmin: true },
  { href: "/admin/api-docs", label: "Swagger Docs", icon: FileText, segment: "api-docs", isAdmin: true },
  { href: "/admin/users", label: "User Management", icon: Users, segment: "users", isAdmin: true },
  { href: "/admin/collections", label: "User Collections", icon: LibraryBig, segment: "collections", isAdmin: true }, // Added segment for admin collections
  { href: "/me/collections", label: "My Collections", icon: ShoppingBag, segment: "collections", isUser: true },
  { href: "/sets", label: "Card Sets", icon: Layers, segment: "sets", isUser: true },
  { href: "/cards", label: "Cards", icon: CreditCard, segment: "cards", isUser: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const fetchUserLayout = useCallback(async () => {
    console.log("[AppLayout] Attempting to fetch user session.");
    setIsLoadingUser(true);
    let newUserData: AppUser | null = null;
    try {
      const res = await fetch(`/api/auth/user?t=${Date.now()}`, { 
        cache: 'no-store',
        credentials: 'include', 
      });
      console.log(`[AppLayout] /api/auth/user responded with status: ${res.status}`);
      
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
      console.error("[AppLayout] Error fetching user session:", error);
    } finally {
      setUser(newUserData);
      setIsLoadingUser(false);
      console.log(`[AppLayout] fetchUserLayout: Processing complete. isLoadingUser is now false. User state will update to:`, newUserData);
    }
  }, []);

  useEffect(() => {
    fetchUserLayout();
  }, [fetchUserLayout]);

  return (
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon" className="hidden md:flex md:flex-col border-r border-sidebar-border">
            <AppSidebarContent navItems={navItems} user={user} />
          </Sidebar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader navItems={navItems} user={user} isLoadingUser={isLoadingUser} />
            <SidebarInset>
              <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
  );
}

