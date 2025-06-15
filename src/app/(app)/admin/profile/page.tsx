
import PageHeader from "@/components/page-header";
import { UserCircle } from "lucide-react";
import { cookies } from 'next/headers';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

interface AppUser {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string; // Changed from picture
  isAdmin?: boolean;
  authSource: 'oidc' | 'local';
}

async function getUserProfile(): Promise<AppUser | null> {
  const cookieStore = cookies();
  
  const appUrl = process.env.APP_URL || 'http://localhost:9002';
  const userApiUrl = `${appUrl}/api/auth/user`;

  try {
    const response = await fetch(userApiUrl, {
      headers: {
        'Cookie': cookieStore.toString(), 
      },
      cache: 'no-store',
      credentials: 'include', 
    });

    if (!response.ok) {
      console.error(`[ProfilePage] Failed to fetch user profile from ${userApiUrl}: ${response.status}`);
      const errorBody = await response.text();
      console.error(`[ProfilePage] Error body: ${errorBody}`);
      return null;
    }
    const data = await response.json();
    return data as AppUser;
  } catch (error) {
    console.error("[ProfilePage] Error fetching user profile:", error);
    return null;
  }
}

export default async function ProfilePage() {
  const user = await getUserProfile();

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
              <Label htmlFor="authSource">Authentication Method</Label>
              <Input id="authSource" value={user.authSource.toUpperCase()} readOnly className="bg-muted/50"/>
            </div>

            <div className="pt-4">
              <h3 className="font-medium mb-2 text-foreground">Actions</h3>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                <Button variant="outline" disabled>Edit Profile (Coming Soon)</Button>
                {user.authSource === 'local' && <Button variant="outline" disabled>Change Password (Coming Soon)</Button>}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
