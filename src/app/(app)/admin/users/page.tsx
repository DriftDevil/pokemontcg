
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import UsersTableClient from "@/components/admin/users-table-client";
import { Users as UsersIcon, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
// useRouter is not directly used for refresh here, using useCallback for fetchUsers
import { useToast } from "@/hooks/use-toast";
import AddUserDialog from '@/components/admin/add-user-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  isAdmin?: boolean;
  createdAt?: string; 
  lastSeen?: string;  
}

interface ApiUserListResponse {
  data?: ApiUser[];
  total?: number;
}

export interface DisplayUser {
  id: string;
  name: string; 
  email: string;
  role: string;  
  status: string; 
  lastLogin: string | null; 
  avatar: string; 
}

function getBaseUrl(): string {
  const appUrlEnv = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  if (appUrlEnv) {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      return parsedAppUrl.origin;
    } catch (error) {
      console.error(`[AdminUsersPage - getBaseUrl] Invalid APP_URL: ${appUrlEnv}. Error: ${error}. Falling back to relative paths or current origin.`);
    }
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

const getAvatarFallbackText = (user: Pick<ApiUser, 'name' | 'preferredUsername' | 'email'>) => {
    const name = user.name || user.preferredUsername;
    if (name) {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || (user.email ? user.email[0].toUpperCase() : 'U');
    }
    return user.email ? user.email[0].toUpperCase() : 'U';
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const baseUrl = getBaseUrl();
    const fetchUrl = `${baseUrl}/api/users/all`;

    try {
      const fetchHeaders = new Headers();
      fetchHeaders.append('Content-Type', 'application/json');
      // Note: Authorization header for GET /api/users/all is typically handled by cookies automatically.
      // If token-based auth via header is strictly needed, it would be added here.

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
        credentials: 'include', // Ensure cookies are sent
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorBody = await response.text();
        let description = `Error: ${response.status}.`;
        if (response.status === 401) {
            description = "Unauthorized. Please log in again to view users.";
        } else if (errorBody) {
            try {
                const parsedError = JSON.parse(errorBody);
                description = parsedError.message || parsedError.details || errorBody;
            } catch (e) {
                description = errorBody;
            }
        }
        
        console.error(`[AdminUsersPage - fetchUsers] Failed to fetch users from ${fetchUrl}: ${response.status}`, errorBody);
        toast({ title: "Failed to load users", description, variant: "destructive" });
        setUsers([]); 
        return;
      }

      const result: ApiUserListResponse = await response.json();
      const apiUsers = result.data || [];

      if (!Array.isArray(apiUsers)) {
        console.error('[AdminUsersPage - fetchUsers] Fetched user data is not an array:', apiUsers);
        toast({ title: "Data Error", description: "Received invalid user data format.", variant: "destructive" });
        setUsers([]);
        return;
      }
      
      const sortedApiUsers = [...apiUsers].sort((a, b) => {
        const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });

      setUsers(sortedApiUsers.map((apiUser): DisplayUser => ({
        id: apiUser.id,
        name: apiUser.name || apiUser.preferredUsername || 'N/A',
        email: apiUser.email || 'N/A',
        role: apiUser.isAdmin ? 'Admin' : 'User',
        status: 'Active', 
        lastLogin: apiUser.lastSeen || apiUser.createdAt || null,
        avatar: `https://placehold.co/40x40.png?text=${getAvatarFallbackText(apiUser)}`,
      })));

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        console.error(`[AdminUsersPage - fetchUsers] NETWORK ERROR: Fetch failed for ${fetchUrl}.`, error);
        toast({ title: "Network Error", description: "Could not connect to the server to fetch users.", variant: "destructive" });
      } else {
        console.error(`[AdminUsersPage - fetchUsers] Error fetching or processing users from ${fetchUrl}:`, error);
        toast({ title: "Error", description: "An unexpected error occurred while fetching users.", variant: "destructive" });
      }
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserAddedOrDeleted = () => {
    fetchUsers(); 
  };
  
  const PageActions = (
    <AddUserDialog onUserAdded={handleUserAddedOrDeleted}>
      <Button>
        <UserPlus className="mr-2 h-4 w-4" />
        Add New User
      </Button>
    </AddUserDialog>
  );

  if (isLoading && users.length === 0) { // Show skeleton only on initial load
    return (
      <>
        <PageHeader
          title="User Management"
          description="Administer user accounts, roles, and permissions."
          icon={UsersIcon}
          actions={<Button disabled><UserPlus className="mr-2 h-4 w-4" /> Add New User</Button>}
        />
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 items-center">
                <Skeleton className="h-10 w-full max-w-sm" />
                <div className="flex gap-2 flex-wrap sm:ml-auto">
                    <Skeleton className="h-10 w-[160px]" />
                    <Skeleton className="h-10 w-[160px]" />
                </div>
            </div>
            <Skeleton className="h-[400px] w-full" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="User Management"
        description="Administer user accounts, roles, and permissions."
        icon={UsersIcon}
        actions={PageActions}
      />
      {users.length > 0 || !isLoading ? ( 
        <UsersTableClient initialUsers={users} onUserDeleted={handleUserAddedOrDeleted} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <UsersIcon className="mx-auto h-12 w-12 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Users Found</h3>
          <p>Either no users exist, or there was an issue fetching user data.</p>
        </div>
      )}
    </>
  );
}
