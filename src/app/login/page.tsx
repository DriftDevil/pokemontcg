
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Gem } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        title: "Login Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      // Clean the URL
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router, toast]);

  const handleOidcLogin = () => {
    // Redirect to our own login API route, which will then redirect to Authentik
    router.push("/api/auth/login");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Gem className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Admin Login</CardTitle>
          <CardDescription>
            Access the PokeAPI management dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Password form removed for simplicity to focus on OIDC */}
           <div className="text-center text-muted-foreground mb-6">
            Please use OIDC to sign in.
          </div>
          <Button variant="outline" className="w-full" size="lg" onClick={handleOidcLogin}>
              Sign in with OIDC (Authentik)
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4 pt-6">
          <Link
            href="/"
            className="text-sm text-primary hover:underline mt-4"
          >
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
