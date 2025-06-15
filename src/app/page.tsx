
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Rocket, BookOpen, Moon, Sun, LayoutDashboard, UserCircle, Layers, CreditCard, LogOut, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string; // Changed from picture
  isAdmin?: boolean;
  authSource?: 'oidc' | 'local';
}

export default function HomePage() {
  console.log("[HomePage] Component mounted or updated.");
  const [theme, setTheme] = useState("light");
  const [loggedInUser, setLoggedInUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(storedTheme);
    if (storedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

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
        console.error("[HomePage] Error fetching user session:", error);
        setLoggedInUser(null);
      } finally {
        setIsLoadingUser(false);
      }
    };
    fetchUserSession();
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
  
  const loggedInAvatarSrc = loggedInUser?.avatarUrl || `https://placehold.co/96x96.png?text=${getAvatarFallbackText(loggedInUser)}`;
  const loggedInAvatarHint = loggedInUser?.avatarUrl && !loggedInUser.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder";


  if (isLoadingUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="fixed top-4 right-4 z-50 text-foreground hover:bg-accent/50 hover:text-accent-foreground"
        >
          {theme === "light" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
        </Button>
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Loading your experience...</p>
      </div>
    );
  }

  if (loggedInUser) {
    return (
      <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 md:p-8 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="fixed top-4 right-4 z-50 text-foreground hover:bg-accent/50 hover:text-accent-foreground"
        >
          {theme === "light" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
        </Button>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
          {loggedInUser.isAdmin && (
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-xl">
                  <LayoutDashboard className="mr-2 h-5 w-5 text-accent" />
                  Admin Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">View site analytics and manage content.</p>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="outline">
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
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/profile">View Profile</Link>
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
              <Button asChild className="w-full" variant="outline">
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
              <Button asChild className="w-full" variant="outline">
                <Link href="/cards">Find Cards</Link>
              </Button>
            </CardFooter>
          </Card>
           <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 ${loggedInUser.isAdmin ? '' : 'lg:col-start-2'}">
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
              <Button asChild className="w-full" variant="destructive">
                <Link href="/api/auth/logout">Sign Out</Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
         <footer className="mt-12 md:mt-16 text-center text-muted-foreground text-sm">
          <p>&copy; {new Date().getFullYear()} PokeAPI. All rights reserved.</p>
          <p>Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </footer>
      </div>
    );
  }

  // Guest View (existing content)
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className="fixed top-4 right-4 z-50 text-foreground hover:bg-accent/50 hover:text-accent-foreground"
      >
        {theme === "light" ? <Moon className="h-6 w-6" /> : <Sun className="h-6 w-6" />}
      </Button>

      <header className="text-center mb-12 pt-16 sm:pt-0">
        <h1 className="font-headline text-5xl md:text-7xl font-bold text-primary mb-4">
          PokeAPI Admin
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Your central hub for managing Pokémon TCG data, powered by an intelligent API and intuitive tools.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 max-w-4xl w-full">
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-2xl">
              <Rocket className="mr-2 h-6 w-6 text-accent" />
              Get Started
            </CardTitle>
            <CardDescription>
              Access the admin dashboard to manage data, users, and view API metrics.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Login to unlock the full potential of the PokeAPI Admin panel.</p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full" size="lg">
              <Link href="/login">Admin Login</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="font-headline flex items-center text-2xl">
              <BookOpen className="mr-2 h-6 w-6 text-accent" />
              Explore API
            </CardTitle>
            <CardDescription>
              Discover available card sets and individual card data through our public endpoints.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Check out the card sets and card data available via the API.</p>
          </CardContent>
          <CardFooter className="flex space-x-4">
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
        <p>&copy; {new Date().getFullYear()} PokeAPI. All rights reserved.</p>
        <p>Pokémon and Pokémon character names are trademarks of Nintendo.</p>
      </footer>
    </div>
  );
}
