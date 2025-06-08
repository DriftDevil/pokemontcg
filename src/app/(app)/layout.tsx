
"use client"; 

import AppHeader from "@/components/layout/app-header";
import AppSidebarContent, { type NavItem } from "@/components/layout/app-sidebar-content";
import { SidebarProvider, Sidebar, SidebarInset } from "@/components/ui/sidebar";
import { LayoutDashboard, Users, FileText, BookOpen, Layers, CreditCard } from "lucide-react";
import { SessionProvider } from "next-auth/react";

const navItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "dashboard", isAdmin: true },
  { href: "/admin/api-docs", label: "Swagger Docs", icon: FileText, segment: "api-docs", isAdmin: true },
  { href: "/admin/users", label: "User Management", icon: Users, segment: "users", isAdmin: true },
  { href: "/sets", label: "Card Sets", icon: Layers, segment: "sets", isUser: true },
  { href: "/cards", label: "Cards", icon: CreditCard, segment: "cards", isUser: true },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider defaultOpen>
        <div className="flex min-h-screen w-full">
          <Sidebar collapsible="icon" className="hidden md:flex md:flex-col border-r border-sidebar-border">
            <AppSidebarContent navItems={navItems} />
          </Sidebar>
          <div className="flex flex-col flex-1 overflow-hidden">
            <AppHeader navItems={navItems} />
            <SidebarInset>
              <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
                {children}
              </main>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </SessionProvider>
  );
}
