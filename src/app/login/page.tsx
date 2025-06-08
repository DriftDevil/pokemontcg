
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
import React, { useEffect } from "react";
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
      // Clean the URL
      router.replace('/login', { scroll: false });
    }
  }, [searchParams, router, toast]);

  const handleOidcLogin = () => {
    router.push("/api/auth/login");
  };

  const onPasswordSubmit: SubmitHandler<PasswordLoginInputs> = async (data) => {
    toast({
      title: "Password Login Not Implemented",
      description: "Please use OIDC (Authentik) to sign in. Password login is for demonstration purposes only.",
      variant: "default",
    });
    console.log("Password login attempt:", data);
    // In a real app, you would call your backend API here:
    // try {
    //   const response = await fetch('/api/auth/password-login', { // This route doesn't exist
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(data),
    //   });
    //   if (response.ok) {
    //     router.push('/admin/dashboard'); // Or wherever you redirect after login
    //   } else {
    //     const errorData = await response.json();
    //     toast({ title: "Login Failed", description: errorData.message || "Invalid credentials", variant: "destructive" });
    //   }
    // } catch (error) {
    //    toast({ title: "Login Error", description: "An unexpected error occurred.", variant: "destructive" });
    // }
  };

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
              />
              {errors.password && (
                <p className="text-xs text-destructive mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" size="lg">
              <LogIn className="mr-2 h-4 w-4" /> Sign in with Password
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <Button variant="outline" className="w-full" size="lg" onClick={handleOidcLogin}>
              Sign in with OIDC (Authentik)
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
