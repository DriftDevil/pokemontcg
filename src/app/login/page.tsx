
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
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const passwordLoginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type PasswordLoginInputs = z.infer<typeof passwordLoginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSubmittingOidc, setIsSubmittingOidc] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordLoginInputs>({
    resolver: zodResolver(passwordLoginSchema),
  });

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      toast({
        title: "Login Error",
        description: decodeURIComponent(error),
        variant: "destructive",
      });
      router.replace('/login', { scroll: false }); 
    }
  }, [searchParams, router, toast]);

  const handleOidcLogin = () => {
    setIsSubmittingOidc(true);
    // For OIDC, we redirect the entire window to the /api/auth/login route
    // which then redirects to the OIDC provider.
    window.location.assign("/api/auth/login"); 
  };

  const onPasswordSubmit: SubmitHandler<PasswordLoginInputs> = async (data) => {
    setIsSubmittingPassword(true);
    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        // Default redirect: 'follow' is crucial here.
        // Fetch will follow the 302 from server.
      });

      // After fetch follows the redirect, response.url will be the *final* URL.
      // response.ok will be true if the final URL returns a 2xx status.
      if (response.ok && response.url.includes('/admin/dashboard')) {
        toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
        // The cookie should have been set by the browser from the 302 response's Set-Cookie header.
        // Now, ensure the client-side navigation matches the browser's state.
        router.push('/admin/dashboard'); // Ensures SPA navigation and history update.
      } else if (!response.ok) { 
        // This handles cases where the /api/auth/password-login route itself returned an error (e.g., 400, 401, 500)
        // OR if the redirect target (/admin/dashboard) returned an error.
        const contentType = response.headers.get("content-type");
        let errorDetails = "Login failed. Please check credentials or contact support.";
        try {
          const errorBodyText = await response.text();
          if (contentType && contentType.includes("application/json")) {
            const parsedError = JSON.parse(errorBodyText); 
            errorDetails = parsedError.details || parsedError.message || errorBodyText;
          } else { 
            console.error("Password login error: Server response was not JSON. Status:", response.status, "Final URL:", response.url, "Body snippet:", errorBodyText.substring(0, 200));
            if (errorBodyText.toLowerCase().includes("<!doctype html")) {
              errorDetails = `Login service returned an unexpected page. Please try again. (Status: ${response.status})`;
            } else {
              errorDetails = `Login failed with status ${response.status}. Unexpected response format.`;
            }
          }
        } catch (e) {
          console.error("Password login response processing error:", e);
        }
        toast({ 
          title: "Login Failed", 
          description: errorDetails, 
          variant: "destructive" 
        });
      } else {
        // Response was ok, but didn't redirect to dashboard (unexpected scenario for password login)
        console.warn("Login response was OK, but final URL was not dashboard:", response.url);
        toast({ title: "Login Info", description: "Login processed, but an unexpected redirect issue occurred.", variant: "default" });
      }
    } catch (error: any) {
      let title = "Login Error";
      let description = "An unexpected error occurred. Please try again.";
      
      // Enhanced logging for "Failed to fetch"
      console.error("Password login submit - raw error object:", error);
      if (error.name) console.error(`Error name: ${error.name}`);
      if (error.message) console.error(`Error message: ${error.message}`);
      if (error.stack) console.error(`Error stack: ${error.stack}`);


      if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
        title = "Network Connection Error";
        description = "Could not connect to the login service. Please ensure the server is running and check your network connection and server logs.";
      } else if (error && typeof error.message === 'string') {
        description = error.message;
      }
      
      toast({ title, description, variant: "destructive" });
    } finally {
      // Check if still on login page before setting loading state to false.
      // If router.push is successful, this component might unmount.
      if (window.location.pathname === '/login' || window.location.pathname.startsWith('/login?')) {
         setIsSubmittingPassword(false);
      }
    }
  };
  
  const isAnyFormSubmitting = isSubmittingOidc || isSubmittingPassword;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Gem className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="font-headline text-3xl">Admin Portal</CardTitle>
          <CardDescription>
            Access the PokeAPI management dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register("email")}
                className={errors.email ? "border-destructive" : ""}
                disabled={isAnyFormSubmitting}
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                className={errors.password ? "border-destructive" : ""}
                disabled={isAnyFormSubmitting}
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={isAnyFormSubmitting}>
              {isSubmittingPassword ? "Signing in..." : <><LogIn className="mr-2 h-4 w-4" /> Sign in with Password</>}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" size="lg" onClick={handleOidcLogin} disabled={isAnyFormSubmitting}>
              {isSubmittingOidc ? "Redirecting..." : "Sign in with OIDC (Authentik)"}
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2 pt-6">
           <p className="px-8 text-center text-xs text-muted-foreground">
            By logging in, you agree to our
            <Link href="/terms" className="underline underline-offset-4 hover:text-primary"> Terms of Service </Link>
            and
            <Link href="/privacy" className="underline underline-offset-4 hover:text-primary"> Privacy Policy</Link>.
          </p>
          <Link
            href="/"
            className="text-sm text-primary hover:underline mt-2"
          >
            Back to Home
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
    
