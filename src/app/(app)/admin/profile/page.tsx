
"use client";
import React, { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { UserCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import ChangePasswordDialog from '@/components/profile/change-password-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  isAdmin?: boolean;
  authSource: 'oidc' | 'local';
}

export default function ProfilePage() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);

  useEffect(() => {
    async function fetchUserProfile() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/auth/user?t=${Date.now()}`, { // Cache-busting
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
          credentials: 'include',
        });

        if (!response.ok) {
          console.error(`[ProfilePage] Failed to fetch user profile: ${response.status}`);
          setUser(null);
          return;
        }
        const data = await response.json();
        setUser(data as AppUser);
      } catch (error) {
        console.error("[ProfilePage] Error fetching user profile:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserProfile();
  }, []);


  if (isLoading) {
    return (
      <>
        <PageHeader title="User Profile" description="Loading your profile information..." icon={UserCircle} />
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader className="items-center text-center">
                    <Skeleton className="h-24 w-24 rounded-full mb-4" />
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="text-center space-y-2">
                    <Skeleton className="h-6 w-24 mx-auto" />
                    <Skeleton className="h-6 w-20 mx-auto" />
                </CardContent>
            </Card>
            <Card className="md:col-span-2">
                <CardHeader>
                    <Skeleton className="h-6 w-1/3 mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-4 w-1/4 mb-1" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ))}
                    <div className="pt-4">
                        <Skeleton className="h-5 w-1/5 mb-2" />
                        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                            <Skeleton className="h-10 w-36" />
                            <Skeleton className="h-10 w-44" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <PageHeader title="Profile" description="View your profile information." icon={UserCircle} />
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Could not load user profile. You might not be logged in or there was an error fetching your details.</p>
            <Button asChild variant="link" className="mt-4">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  const getAvatarFallbackText = (currentUser: AppUser) => {
    const name = currentUser.name;
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || (currentUser.email ? currentUser.email[0].toUpperCase() : 'U');
    }
    return currentUser.email ? currentUser.email[0].toUpperCase() : 'U';
  }
  
  const avatarSrc = user.avatarUrl || `https://placehold.co/96x96.png?text=${getAvatarFallbackText(user)}`;
  const avatarHint = user.avatarUrl && !user.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder";

  return (
    <>
      <PageHeader title="User Profile" description="Manage your profile information and settings." icon={UserCircle} />
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
              <AvatarImage 
                src={avatarSrc} 
                alt={user.name || 'User Avatar'} 
                data-ai-hint={avatarHint}
              />
              <AvatarFallback className="text-3xl">{getAvatarFallbackText(user)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{user.name || 'User'}</CardTitle>
            {user.email && <CardDescription>{user.email}</CardDescription>}
          </CardHeader>
          <CardContent className="text-center space-y-2">
             <Badge variant={user.authSource === 'oidc' ? 'default' : 'secondary'}>
                Authenticated via: {user.authSource.toUpperCase()}
             </Badge>
             {user.isAdmin && <Badge variant="outline" className="ml-2">Administrator</Badge>}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Your personal information. Editing is not yet available.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={user.name || 'Not set'} readOnly className="bg-muted/50"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" value={user.email || 'Not set'} readOnly className="bg-muted/50"/>
            </div>
            <div className="space-y-1">
              <Label htmlFor="userId">User ID</Label>
              <Input id="userId" value={user.id} readOnly className="bg-muted/50"/>
            </div>
             <div className="space-y-1">
              <Label htmlFor="authSourceVal">Authentication Method</Label>
              <Input id="authSourceVal" value={user.authSource.toUpperCase()} readOnly className="bg-muted/50"/>
            </div>

            <div className="pt-4">
              <h3 className="font-medium mb-2 text-foreground">Actions</h3>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" disabled>Edit Profile (Coming Soon)</Button>
                {user.authSource === 'local' && (
                  <Button variant="outline" onClick={() => setShowChangePasswordDialog(true)}>
                    Change Password
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {user.authSource === 'local' && (
        <ChangePasswordDialog
          open={showChangePasswordDialog}
          onOpenChange={setShowChangePasswordDialog}
        />
      )}
    </>
  );
}
