
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation"; // Import useRouter
import { Gem, LayoutDashboard, Users, FileText, Layers, CreditCard, Settings, LogOut, ShoppingBag, LibraryBig } from "lucide-react";
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
  const router = useRouter(); // Initialize useRouter
  const currentUserIsAdmin = user?.isAdmin ?? false;

  const isActive = (item: NavItem) => {
    if (item.segment) {
      // For admin/collections, segment is 'collections'. Pathname might be /admin/collections.
      // Need to ensure we are specific enough if segments overlap.
      if (item.href === "/admin/collections" && pathname.startsWith("/admin/collections")) return true;
      if (item.href === "/me/collections" && pathname.startsWith("/me/collections")) return true;
      if (item.href !== "/admin/collections" && item.href !== "/me/collections" && pathname.startsWith(item.href)) return true;
      // Fallback for general segment matching if href is not a prefix
      if (pathname.includes(`/${item.segment}`) && item.href.includes(`/${item.segment}`)) return true;
    }
    return pathname === item.href;
  };

  const handleMobileLinkClick = (href: string) => {
    if (isMobile) {
      router.push(href);
      // Close the sheet after navigation
      // Assuming the sheet trigger can be found and clicked, or a custom event is dispatched
      const sheetCloseEvent = new Event('closeSheet', { bubbles: true, cancelable: true });
      document.dispatchEvent(sheetCloseEvent);

      // A more direct way if you have access to the sheet's open/setOpen state via context:
      // closeMobileSheetFunction(); 
    } else {
      router.push(href);
    }
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    if (item.isAdmin && !currentUserIsAdmin) {
      return null;
    }
    if (item.isUser && !user && !['/sets', '/cards'].includes(item.href)) {
        return null;
    }
    // Special handling for /admin/collections to avoid conflict with /me/collections segment
    let itemIsActive = isActive(item);
    if (item.href === "/admin/collections" && pathname.startsWith("/me/collections")) {
        itemIsActive = false;
    }
    if (item.href === "/me/collections" && pathname.startsWith("/admin/collections")) {
        itemIsActive = false;
    }


    const commonLinkClasses = cn(
      "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:text-sidebar-accent-foreground hover:bg-sidebar-accent",
      itemIsActive && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold",
      depth > 0 && "pl-8"
    );

    return (
    <li key={item.href}>
      {item.subItems ? (
        <Accordion type="single" collapsible className="w-full" defaultValue={item.subItems.some(sub => isActive(sub)) ? item.href : undefined}>
          <AccordionItem value={item.href} className="border-b-0">
            <AccordionTrigger
              className={cn(
                commonLinkClasses,
                "justify-between", // AccordionTrigger specific styling
                itemIsActive && !item.subItems?.some(sub => isActive(sub)) && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
            </AccordionTrigger>
            <AccordionContent className="pl-4 pt-1 pb-0">
              <ul className="space-y-1">
                {item.subItems.map(subItem => renderNavItem(subItem, depth + 1))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      ) : (
        <button
          onClick={() => handleMobileLinkClick(item.href)}
          className={cn(commonLinkClasses, "w-full text-left")} // Make button look like a link
          aria-current={itemIsActive ? "page" : undefined}
        >
          <item.icon className="h-5 w-5" />
          {item.label}
        </button>
      )}
    </li>
    );
  };

  const adminNavItems = navItems.filter(item => item.isAdmin);
  const primaryUserNavItems = navItems.filter(item => item.isUser && item.href !== '/me/collections');
  const collectionsNavItem = navItems.find(item => item.href === '/me/collections');

  const shouldShowAdminSection = currentUserIsAdmin && adminNavItems.length > 0;
  const shouldShowPrimaryUserSection = primaryUserNavItems.length > 0;
  const shouldShowCollectionsSection = user && collectionsNavItem;

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
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" 
              onClick={() => handleMobileLinkClick('/admin/profile')}
            >
              <Settings className="mr-2 h-5 w-5" /> Profile &amp; Settings
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent" 
              onClick={() => handleMobileLinkClick('/api/auth/logout')}
            >
              <LogOut className="mr-2 h-5 w-5" /> Logout
            </Button>
         </div>
      )}
    </>
  );
}

