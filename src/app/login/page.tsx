
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
    window.location.assign("/api/auth/login"); // Use full page load for OIDC start
  };

  const onPasswordSubmit: SubmitHandler<PasswordLoginInputs> = async (data) => {
    setIsSubmittingPassword(true);
    try {
      const response = await fetch('/api/auth/password-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const contentType = response.headers.get("content-type");
      if (response.ok && contentType && contentType.includes("application/json")) {
        const responseData = await response.json(); // Only parse if truly JSON and OK
        if (responseData.message === 'Login successful') {
            toast({ title: "Login Successful", description: "Redirecting to dashboard..." });
            window.location.assign('/admin/dashboard'); // Full page load for reliable cookie setting
        } else {
            // This case might not be hit if !response.ok handles API errors, but good for safety
            toast({ 
              title: responseData.message || "Login Failed", 
              description: responseData.details || "An issue occurred during login.", 
              variant: "destructive" 
            });
        }
      } else {
        // Handle non-JSON responses or non-OK responses
        let errorDetails = "An unexpected error occurred. The server might be down or returned an invalid response.";
        try {
          const errorBodyText = await response.text();
          if (contentType && contentType.includes("application/json")) {
            const parsedError = JSON.parse(errorBodyText); // If server sent JSON error
            errorDetails = parsedError.details || parsedError.message || errorBodyText;
          } else { // HTML or other non-JSON error
            console.error("Password login error: Server response was not JSON. Status:", response.status, "Body snippet:", errorBodyText.substring(0, 200));
            errorDetails = `Login failed (Status: ${response.status}). Please check credentials or contact support if the issue persists.`;
            if (errorBodyText.toLowerCase().includes("<!doctype html")) {
              errorDetails = `Login service returned an unexpected page. Please try again. (Status: ${response.status})`;
            }
          }
        } catch (e) {
          // Catch error from await response.text() or JSON.parse itself
          console.error("Password login response processing error:", e);
        }
        toast({ 
          title: "Login Failed", 
          description: errorDetails, 
          variant: "destructive" 
        });
      }
    } catch (error) {
       toast({ title: "Network Error", description: "Could not connect to the login service. Please check your internet connection and try again.", variant: "destructive" });
       console.error("Password login submit fetch/network error:", error);
    } finally {
      // Only set to false if not redirecting, though with window.location.assign this might not always run
      // or its effect might not be visible. If still on login page, means redirect didn't happen.
      if (window.location.pathname.endsWith('/login')) {
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
