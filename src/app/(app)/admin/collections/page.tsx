
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageHeader from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LibraryBig, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { DisplayUser as AdminDisplayUser } from '@/app/(app)/admin/users/page'; // Re-using this type
import logger from '@/lib/logger';

// For this page, the user data is the primary focus. Collection summary per user can be an enhancement.
interface UserForCollectionOverview extends AdminDisplayUser {
  // Potentially add collection summary fields here later if API supports it
  // totalUniqueCardsInCollection?: number;
  // totalCardsInCollection?: number;
}

interface ApiUserListResponse {
  data?: AdminDisplayUser[]; // Backend returns users with 'avatarUrl' etc.
  total?: number;
}

export default function AdminAllCollectionsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserForCollectionOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const fetchAllUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users/all', { cache: 'no-store', credentials: 'include' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch users: ${response.status} ${errorText.substring(0, 100)}`);
      }
      const result: ApiUserListResponse = await response.json();
      const apiUsers = result.data || [];

      if (!Array.isArray(apiUsers)) {
        logger.error('AdminAllCollectionsPage', 'Fetched user data is not an array:', apiUsers);
        toast({ title: "Data Error", description: "Received invalid user data format.", variant: "destructive" });
        setUsers([]);
        return;
      }
      
      // Sort users by name initially
      const sortedApiUsers = [...apiUsers].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      setUsers(sortedApiUsers.map(u => ({
        ...u, // Spread existing AdminDisplayUser fields
        // Add any transformation or mapping needed for UserForCollectionOverview
      })));

    } catch (error: any) {
      logger.error("AdminAllCollectionsPage", "Error fetching users:", error);
      toast({ title: "Error Fetching Users", description: error.message, variant: "destructive" });
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const filteredUsers = useMemo(() => {
    return users.filter(user =>
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredUsers, currentPage, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));

   useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (currentPage === 0 && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const getAvatarFallbackText = (user: UserForCollectionOverview) => {
    const name = user.name;
    if (name && name !== 'N/A') {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || (user.email && user.email !== 'N/A' ? user.email[0].toUpperCase() : 'U');
    }
    return user.email && user.email !== 'N/A' ? user.email[0].toUpperCase() : 'U';
  }

  if (isLoading && users.length === 0) {
    return (
      <>
        <PageHeader
          title="User Collections Management"
          description="Loading user data..."
          icon={LibraryBig}
        />
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3 mb-2" />
                <Skeleton className="h-10 w-full max-w-sm" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-[300px] w-full" />
            </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="User Collections Management"
        description={`Browse and access collections of all ${filteredUsers.length} users.`}
        icon={LibraryBig}
      />
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Select a user to view their card collection.</CardDescription>
           <div className="pt-2">
            <Input
                placeholder="Search users (name, email)..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length > 0 ? paginatedUsers.map((user) => {
                  const avatarDisplaySrc = user.avatarUrl || `https://placehold.co/40x40.png?text=${getAvatarFallbackText(user)}`;
                  const avatarDisplayHint = user.avatarUrl && !user.avatarUrl.includes('placehold.co') ? "user avatar" : "avatar placeholder";
                  return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                           <AvatarImage 
                            src={avatarDisplaySrc} 
                            alt={user.name} 
                            data-ai-hint={avatarDisplayHint}
                           />
                          <AvatarFallback>{getAvatarFallbackText(user)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name || 'N/A'}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{user.email || 'N/A'}</TableCell>
                    <TableCell className="hidden md:table-cell">{user.role || 'User'}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/users/${user.id}/collection`}>
                          <ShoppingBag className="mr-2 h-4 w-4" />
                          View Collection
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )}) : (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                            {isLoading ? "Loading users..." : (searchTerm ? "No users match your search." : "No users found.")}
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
