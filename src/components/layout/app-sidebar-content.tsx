"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, LayoutDashboard, Users, FileText, BookOpen, Layers, CreditCard, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  segment?: string;
  isAdmin?: boolean;
  isUser?: boolean; // for general user sections
  subItems?: NavItem[];
}

const defaultNavItems: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, segment: "dashboard", isAdmin: true },
  { href: "/admin/api-docs", label: "Swagger Docs", icon: FileText, segment: "api-docs", isAdmin: true },
  { href: "/admin/users", label: "User Management", icon: Users, segment: "users", isAdmin: true },
  { href: "/sets", label: "Card Sets", icon: Layers, segment: "sets", isUser: true },
  { href: "/cards", label: "Cards", icon: CreditCard, segment: "cards", isUser: true },
];

// Mock admin state, in real app this would come from auth context
const useIsAdmin = () => {
    const pathname = usePathname();
    return pathname.startsWith('/admin');
};

export default function AppSidebarContent({ navItems = defaultNavItems, isMobile = false }: { navItems?: NavItem[], isMobile?: boolean }) {
  const pathname = usePathname();
  const isAdminRoute = useIsAdmin(); // This is a mock, replace with real auth check

  const isActive = (item: NavItem) => {
    if (item.segment) {
      return pathname.startsWith(item.href) || pathname.includes(item.segment);
    }
    return pathname === item.href;
  };

  const renderNavItem = (item: NavItem, depth = 0) => (
    <li key={item.href}>
      {item.subItems ? (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={item.href} className="border-b-0">
            <AccordionTrigger 
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-primary",
                isActive(item) && "bg-sidebar-accent text-sidebar-primary",
                depth > 0 && "pl-8" 
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 pb-0">
              <ul className="space-y-1">
                {item.subItems.map(subItem => renderNavItem(subItem, depth + 1))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <Link
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-primary hover:bg-sidebar-accent",
            isActive(item) && "bg-sidebar-accent text-sidebar-primary font-semibold",
            depth > 0 && "pl-8" 
          )}
          onClick={isMobile ? () => document.dispatchEvent(new Event('closeSheet')) : undefined} // Simple way to close sheet
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      )}
    </li>
  );

  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 lg:px-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
          <Gem className="h-7 w-7 text-primary" />
          <span className="font-headline text-xl">PokeAPI</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4 px-2 text-sm font-medium">
        <ul className="space-y-1">
          {navItems.filter(item => item.isAdmin && isAdminRoute).map(item => renderNavItem(item))}
          {isAdminRoute && <Separator className="my-2 bg-sidebar-border" />}
          {navItems.filter(item => item.isUser).map(item => renderNavItem(item))}
        </ul>
      </nav>
      {isMobile && (
         <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent">
                <Settings className="mr-2 h-5 w-5" /> Settings
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-primary hover:bg-sidebar-accent">
                <LogOut className="mr-2 h-5 w-5" /> Logout
            </Button>
         </div>
      )}
    </>
  );
}
