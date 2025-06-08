
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gem, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const router = useRouter();

  const handleSubmitPassword = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement actual password-based authentication logic if needed
    // For now, this part is not connected to NextAuth OIDC
    console.log("Simulating admin password login...");
    // Example: Call signIn with 'credentials' provider if you set one up
    // signIn('credentials', { redirect: false, email: event.currentTarget.email.value, password: event.currentTarget.password.value })
    //   .then(res => { if (res?.ok) router.push("/admin/dashboard"); else console.error("Password login failed", res?.error) });
    alert("Password login form submitted. Implement actual logic or remove if OIDC is primary.");
  };

  const handleOidcLogin = () => {
    // Redirect to Authentik, then Authentik redirects back to /api/auth/callback/authentik
    // which NextAuth handles. On success, redirect to /admin/dashboard.
    signIn('authentik', { callbackUrl: '/admin/dashboard' });
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
          <form onSubmit={handleSubmitPassword} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                className="text-base"
                name="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••" 
                required 
                className="text-base"
                name="password"
              />
            </div>
            <Button type="submit" className="w-full" size="lg">
              <LogIn className="mr-2 h-5 w-5" />
              Sign In with Password
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-4 pt-6">
            <div className="relative w-full flex items-center">
              <div className="flex-grow border-t border-muted"></div>
              <span className="flex-shrink mx-4 text-muted-foreground text-sm">Or</span>
              <div className="flex-grow border-t border-muted"></div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleOidcLogin}>
                Sign in with OIDC (Authentik)
            </Button>
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
