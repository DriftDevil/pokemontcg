
"use client"; 

import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import UsersTableClient from "@/components/admin/users-table-client";
import { Users as UsersIcon, UserPlus, TestTubeDiagonal, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AddUserDialog from '@/components/admin/add-user-dialog';
import AddTestUsersDialog from '@/components/admin/add-test-users-dialog';
import RemoveTestUsersDialog from '@/components/admin/remove-test-users-dialog';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiUser {
  id: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
  isAdmin?: boolean;
  createdAt?: string; 
  lastSeen?: string;
  avatarUrl?: string; 
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
  avatarUrl?: string; 
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const appUrlEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrlEnv) {
    try {
      const parsedAppUrl = new URL(appUrlEnv);
      return parsedAppUrl.origin;
    } catch (error) {
      console.error(`[AdminUsersPage - getBaseUrl] Invalid NEXT_PUBLIC_APP_URL: ${appUrlEnv}. Error: ${error}.`);
    }
  }
  console.warn("[AdminUsersPage - getBaseUrl] Falling back to relative paths as origin could not be determined.");
  return ''; 
}

// Heuristic to identify test users
const isTestUser = (user: DisplayUser): boolean => {
  if (user.name?.toLowerCase().includes('test user #')) return true;
  if (user.email?.toLowerCase().startsWith('testuser')) return true;
  if (user.email?.toLowerCase().startsWith('mockuser')) return true; // Mocks might also be considered test users
  return false;
};

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<DisplayUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [testUserCount, setTestUserCount] = useState(0);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    const baseUrl = getBaseUrl();
    const fetchUrl = `${baseUrl}${baseUrl ? '' : '/'}/api/users/all`;

    try {
      const fetchHeaders = new Headers();
      fetchHeaders.append('Content-Type', 'application/json');

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: fetchHeaders,
        credentials: 'include', 
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
                description = parsedError.message || parsedError.details || errorBody.substring(0,100);
            } catch (e) {
                description = errorBody.substring(0,100);
            }
        }
        
        console.error(`[AdminUsersPage - fetchUsers] Failed to fetch users from ${fetchUrl}: ${response.status}`, errorBody);
        toast({ title: "Failed to load users", description, variant: "destructive" });
        setUsers([]); 
        setTestUserCount(0);
        setIsLoading(false);
        return;
      }

      const result = await response.json(); 
      
      const apiUsersData = result && result.data;

      if (!Array.isArray(apiUsersData)) {
        console.error('[AdminUsersPage - fetchUsers] Fetched user data (result.data) is not an array:', apiUsersData);
        toast({ title: "Data Error", description: "Received invalid user data format from API.", variant: "destructive" });
        setUsers([]);
        setTestUserCount(0);
        setIsLoading(false);
        return;
      }
      
      const typedApiUsers = apiUsersData as ApiUser[]; 

      const sortedApiUsers = [...typedApiUsers].sort((a, b) => {
        const dateA = a.lastSeen ? new Date(a.lastSeen).getTime() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
        const dateB = b.lastSeen ? new Date(b.lastSeen).getTime() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
        return dateB - dateA;
      });

      const mappedUsers = sortedApiUsers.map((apiUser): DisplayUser => ({
        id: apiUser.id, 
        name: apiUser.name || apiUser.preferredUsername || 'N/A',
        email: apiUser.email || 'N/A',
        role: apiUser.isAdmin ? 'Admin' : 'User',
        status: 'Active', 
        lastLogin: apiUser.lastSeen || apiUser.createdAt || null,
        avatarUrl: apiUser.avatarUrl, 
      }));
      setUsers(mappedUsers);
      
      const currentTestUsersCount = mappedUsers.filter(isTestUser).length;
      setTestUserCount(currentTestUsersCount);

    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch failed')) {
        console.error(`[AdminUsersPage - fetchUsers] NETWORK ERROR: Fetch failed for ${fetchUrl}.`, error);
        toast({ title: "Network Error", description: "Could not connect to the server to fetch users.", variant: "destructive" });
      } else {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error(`[AdminUsersPage - fetchUsers] Error fetching or processing users from ${fetchUrl}:`, errorMessage, error);
        toast({ title: "Error", description: `An unexpected error occurred while fetching users: ${errorMessage.substring(0,100)}`, variant: "destructive" });
      }
      setUsers([]);
      setTestUserCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);


  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleUserListChanged = () => {
    fetchUsers(); 
  };
  
  const PageActions = (
    <div className="flex flex-wrap gap-2">
      <AddUserDialog onUserAdded={handleUserListChanged}>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </AddUserDialog>
      <AddTestUsersDialog onUsersChanged={handleUserListChanged}>
        <Button variant="outline">
          <TestTubeDiagonal className="mr-2 h-4 w-4" />
          Add Test Users
        </Button>
      </AddTestUsersDialog>
      <RemoveTestUsersDialog onUsersChanged={handleUserListChanged}>
        <Button variant="destructive" disabled={isLoading || testUserCount === 0}>
          <UserX className="mr-2 h-4 w-4" />
          Remove Test Users
        </Button>
      </RemoveTestUsersDialog>
    </div>
  );

  if (isLoading && users.length === 0) { 
    return (
      <>
        <PageHeader
          title="User Management"
          description="Administer user accounts, roles, and permissions."
          icon={UsersIcon}
          actions={
            <div className="flex flex-wrap gap-2">
              <Button disabled><UserPlus className="mr-2 h-4 w-4" /> Add New User</Button>
              <Button variant="outline" disabled><TestTubeDiagonal className="mr-2 h-4 w-4" /> Add Test Users</Button>
              <Button variant="destructive" disabled><UserX className="mr-2 h-4 w-4" /> Remove Test Users</Button>
            </div>
          }
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
      <UsersTableClient initialUsers={users} onUserDeleted={handleUserListChanged} />
    </>
  );
}

