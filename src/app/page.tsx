
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Rocket, BookOpen, LayoutDashboard, UserCircle, Layers, CreditCard, LogOut, LogIn, Loader2, ShoppingBag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import ThemeSwitcher from "@/components/theme-switcher"; // Import the new ThemeSwitcher
import logger from "@/lib/logger";

export interface AppUser { // Exporting AppUser
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource?: 'oidc' | 'local' | 'mock';
}

export default function HomePage() {
  const [loggedInUser, setLoggedInUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchUserSession = async () => {
      setIsLoadingUser(true);
      try {
        const res = await fetch(`/api/auth/user?t=${Date.now()}`, {
          cache: 'no-store',
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.id) {
            setLoggedInUser(data);
          } else {
            setLoggedInUser(null);
          }
        } else {
          setLoggedInUser(null);
        }
      } catch (error) {
        logger.error('HomePage', "Error fetching user session:", error);
        setLoggedInUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserSession();
  }, []);


  const handleLogout = () => {
    // Direct navigation for logout to ensure full page reload cycle
    window.location.href = '/api/auth/logout';
  };

  const getAvatarFallbackText = (user: AppUser | null) => {
    if (!user) return 'U';
    const nameOrEmail = user.name || user.email;
    if (nameOrEmail) {
      const parts = nameOrEmail.split(' ');
      if (parts.length > 1 && parts[0] && parts[parts.length - 1]) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      if (parts[0]) return parts[0][0].toUpperCase();
    }
    return 'U';
  }

  const loggedInAvatarSrc = loggedInUser?.avatarUrl || `https://placehold.co/40x40.png?text=${getAvatarFallbackText(loggedInUser)}`;
  const loggedInAvatarHint = loggedInUser?.avatarUrl && !loggedInUser.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder";


  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 relative">
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitcher />
        </div>
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading your experience...</p>
      </div>
    );
  }

  if (loggedInUser) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 md:p-8 relative">
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitcher />
        </div>

        <header className="text-center my-8 md:my-12 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Avatar className="h-24 w-24 border-2 border-primary shadow-lg">
              <AvatarImage
                src={loggedInAvatarSrc}
                alt={loggedInUser.name || "User"}
                data-ai-hint={loggedInAvatarHint}
              />
              <AvatarFallback className="text-3xl">{getAvatarFallbackText(loggedInUser)}</AvatarFallback>
            </Avatar>
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-primary">
              Welcome Back, {loggedInUser.name || loggedInUser.email || 'User'}!
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Here are some quick actions to get you started.
          </p>
        </header>

        <div className={cn(
          "grid grid-cols-1 gap-6 w-full",
          loggedInUser.isAdmin
            ? "sm:grid-cols-2 lg:grid-cols-3 max-w-4xl"
            : "sm:grid-cols-2 max-w-3xl"
        )}>
          {loggedInUser.isAdmin && (
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-xl">
                  <LayoutDashboard className="mr-2 h-5 w-5 text-accent" />
                  Admin Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View site analytics, manage users, and more.</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href="/admin/dashboard">Go to Dashboard</Link>
                </Button>
              </CardFooter>
            </Card>
          )}
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl">
                <UserCircle className="mr-2 h-5 w-5 text-accent" />
                Your Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage your profile settings.</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/admin/profile">View Profile</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl">
                <ShoppingBag className="mr-2 h-5 w-5 text-accent" />
                My Collections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">View and manage your collected Pokémon cards.</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/me/collections">View My Collections</Link>
              </Button>
            </CardFooter>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl">
                <Layers className="mr-2 h-5 w-5 text-accent" />
                Card Sets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Explore all available Pokémon TCG sets.</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/sets">Browse Sets</Link>
              </Button>
            </CardFooter>
          </Card>
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl">
                <CreditCard className="mr-2 h-5 w-5 text-accent" />
                Browse Cards
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Search and filter individual Pokémon cards.</p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href="/cards">Find Cards</Link>
              </Button>
            </CardFooter>
          </Card>
           <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-xl">
                <LogOut className="mr-2 h-5 w-5 text-destructive" />
                Logout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Sign out of your current session.</p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLogout} className="w-full" variant="destructive">
                Sign Out
              </Button>
            </CardFooter>
          </Card>
        </div>
         <footer className="mt-12 md:mt-16 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PokemonTCG. All rights reserved.</p>
          <p>Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </div>
    );
  }

  // Guest View (Not Logged In)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 relative">
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitcher />
      </div>
      <header className="text-center mb-12 pt-16 sm:pt-0">
        <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary mb-4">
          PokemonTCG
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central hub for managing Pokémon TCG data, powered by an intelligent API and intuitive tools.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-2xl">
              <LogIn className="mr-2 h-6 w-6 text-accent" />
              Access Your Account
            </CardTitle>
            <CardDescription>
              Login to manage your card collections, view your profile, and access other user features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Unlock the full potential of the PokemonTCG portal by signing in.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" size="lg"><Link href="/login">Login</Link></Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-2xl">
              <BookOpen className="mr-2 h-6 w-6 text-accent" />
              Explore TCG Data
            </CardTitle>
            <CardDescription>
              Discover available Pokémon card sets and individual card data through our public interface.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Check out the card sets and card data available for browsing.</p>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <Button asChild variant="outline" className="w-full">
              <Link href="/sets">View Card Sets</Link>
            </Button>
             <Button asChild variant="outline" className="w-full">
              <Link href="/cards">View Cards</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <footer className="mt-16 text-center text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} PokemonTCG. All rights reserved.</p>
        <p>Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </div>
  );
}
