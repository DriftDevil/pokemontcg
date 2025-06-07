import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Rocket, BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <header className="text-center mb-12">
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
