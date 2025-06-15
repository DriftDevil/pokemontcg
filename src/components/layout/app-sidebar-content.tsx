
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gem, LayoutDashboard, Users, FileText, Layers, CreditCard, Settings, LogOut, ShoppingBag } from "lucide-react";
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
  isUser?: boolean;
  subItems?: NavItem[];
}

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource?: 'oidc' | 'local';
}

interface AppSidebarContentProps {
  navItems: NavItem[];
  isMobile?: boolean;
  user: AppUser | null;
}

export default function AppSidebarContent({ navItems, isMobile = false, user }: AppSidebarContentProps) {
  const pathname = usePathname();
  const currentUserIsAdmin = user?.isAdmin ?? false;

  const isActive = (item: NavItem) => {
    if (item.segment) {
      return pathname.startsWith(item.href) || pathname.includes(item.segment);
    }
    return pathname === item.href;
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    // Skip rendering admin items if user is not admin
    if (item.isAdmin && !currentUserIsAdmin) {
      return null;
    }
    // Skip rendering user items if user is not logged in (unless it's a public page like /cards or /sets)
    if (item.isUser && !user && !['/sets', '/cards'].includes(item.href)) {
        return null;
    }


    return (
    <li key={item.href}>
      {item.subItems ? (
        <Accordion type="single" collapsible className="w-full" defaultValue={item.subItems.some(sub => isActive(sub)) ? item.href : undefined}>
          <AccordionItem value={item.href} className="border-b-0">
            <AccordionTrigger
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground",
                isActive(item) && !item.subItems?.some(sub => isActive(sub)) && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
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
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
            isActive(item) && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
            depth > 0 && "pl-8"
          )}
          onClick={isMobile ? () => document.dispatchEvent(new Event('closeSheet')) : undefined}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </Link>
      )}
    </li>
    );
  };

  const adminNavItems = navItems.filter(item => item.isAdmin);
  const primaryUserNavItems = navItems.filter(item => item.isUser && item.href !== '/me/collections');
  const collectionsNavItem = navItems.find(item => item.href === '/me/collections');

  const shouldShowAdminSection = currentUserIsAdmin && adminNavItems.length > 0;
  const shouldShowPrimaryUserSection = primaryUserNavItems.length > 0;
  const shouldShowCollectionsSection = user && collectionsNavItem; // Only show if user logged in

  // Determine if separators are needed
  const sepAdminUser = shouldShowAdminSection && (shouldShowPrimaryUserSection || shouldShowCollectionsSection);
  const sepUserCollections = shouldShowPrimaryUserSection && shouldShowCollectionsSection;


  return (
    <>
      <div className="flex h-16 items-center border-b border-sidebar-border px-4 lg:px-6 shrink-0">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-primary-foreground">
          <Gem className="h-7 w-7 text-primary" />
          <span className="font-headline text-xl">PokemonTCG</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-auto py-4 px-2 text-sm font-medium">
        <ul className="space-y-1">
          {shouldShowAdminSection && adminNavItems.map(item => renderNavItem(item))}

          {sepAdminUser && <Separator className="my-2 bg-sidebar-border" />}

          {shouldShowCollectionsSection && collectionsNavItem && renderNavItem(collectionsNavItem)}

          {sepUserCollections && <Separator className="my-2 bg-sidebar-border" />}

          {shouldShowPrimaryUserSection && primaryUserNavItems.map(item => renderNavItem(item))}
        </ul>
      </nav>
      {isMobile && user && (
         <div className="mt-auto p-4 border-t border-sidebar-border">
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" asChild>
                <Link href="/admin/profile"><Settings className="mr-2 h-5 w-5" /> Profile & Settings</Link>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" asChild>
                <Link href="/api/auth/logout"><LogOut className="mr-2 h-5 w-5" /> Logout</Link>
            </Button>
         </div>
      )}
    </>
  );
}

