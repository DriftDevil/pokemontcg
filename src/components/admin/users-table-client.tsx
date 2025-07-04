
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { DisplayUser as User } from '@/app/(app)/admin/users/page';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowUpDown, MoreHorizontal, Trash2, Edit3, Eye, ShoppingBag, Users2, TestTubeDiagonal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { Separator } from '../ui/separator';
import logger from '@/lib/logger';

interface UsersTableClientProps {
  initialUsers: User[];
  onUserDeleted: () => void; 
}

type SortKey = keyof User | '';
type SortDirection = 'asc' | 'desc';

const isTestUser = (user: User): boolean => {
  if (user.name?.toLowerCase().includes('test user #')) return true;
  if (user.email?.toLowerCase().startsWith('testuser')) return true;
  if (user.email?.toLowerCase().startsWith('mockuser')) return true;
  return false;
};

export default function UsersTableClient({ initialUsers, onUserDeleted }: UsersTableClientProps) {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter(user =>
      (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    if (sortKey === 'name') {
      filtered.sort((a, b) => {
        const extractNumberFromName = (name: string): number | null => {
          const match = name.match(/#(\d+)$/);
          return match ? parseInt(match[1], 10) : null;
        };

        const valA = a.name || '';
        const valB = b.name || '';
        
        const numA = extractNumberFromName(valA);
        const numB = extractNumberFromName(valB);


        if (numA !== null && numB !== null) {
          return sortDirection === 'asc' ? numA - numB : numB - numA;
        } else if (numA !== null && numB === null) {
          return sortDirection === 'asc' ? -1 : 1;
        } else if (numA === null && numB !== null) {
          return sortDirection === 'asc' ? 1 : -1;
        } else {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
      });
    } else if (sortKey) {
      filtered.sort((a, b) => {
        const valA = a[sortKey as keyof User];
        const valB = b[sortKey as keyof User];
        
        if (sortKey === 'lastLogin') {
          const dateA = valA ? new Date(valA as string).getTime() : 0;
          const dateB = valB ? new Date(valB as string).getTime() : 0;
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        }
        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
    }
    return filtered;
  }, [users, searchTerm, roleFilter, statusFilter, sortKey, sortDirection]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedUsers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedUsers, currentPage, itemsPerPage]);

  const paginatedTestUsers = useMemo(() => paginatedUsers.filter(isTestUser), [paginatedUsers]);
  const paginatedRegularUsers = useMemo(() => paginatedUsers.filter(user => !isTestUser(user)), [paginatedUsers]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedUsers.length / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);


  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      default: return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700/30 dark:text-slate-300 dark:border-slate-500';
    }
  };
  
  const getAvatarFallbackTextClient = (user: User) => {
    const name = user.name;
    if (name && name !== 'N/A') {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0,2) || (user.email && user.email !== 'N/A' ? user.email[0].toUpperCase() : 'U');
    }
    return user.email && user.email !== 'N/A' ? user.email[0].toUpperCase() : 'U';
  }

  const viewUser = (userId: string) => alert('View user: ' + userId + ' (Not implemented)');
  const editUser = (userId: string) => alert('Edit user: ' + userId + ' (Not implemented)');
  
  const handleDeleteRequest = (user: User) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/remove/${userToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include', 
      });

      if (response.ok) { 
        toast({
          title: "User Deleted",
          description: `User ${userToDelete.name} (${userToDelete.email}) has been successfully deleted.`,
        });
        onUserDeleted(); 
      } else {
        const result = await response.json().catch(() => ({ message: "An unknown error occurred on deletion." })); 
        toast({
          title: "Failed to Delete User",
          description: result.message || result.details || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("UsersTableClient", "Failed to delete user:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to delete user.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const renderUserTableRows = (userList: User[]) => (
    userList.map((user) => {
      const avatarDisplaySrc = user.avatarUrl || `https://placehold.co/40x40.png?text=${getAvatarFallbackTextClient(user)}`;
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
                <AvatarFallback>{getAvatarFallbackTextClient(user)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          </TableCell>
          <TableCell>{user.role}</TableCell>
          <TableCell className="hidden md:table-cell">
            <Badge variant={'outline'} className={cn("border", getStatusBadgeVariant(user.status))}>
              {user.status}
            </Badge>
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            {user.lastLogin ? new Date(user.lastLogin).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true }) : 'N/A'}
          </TableCell>
          <TableCell className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => viewUser(user.id)} disabled>
                  <Eye className="mr-2 h-4 w-4" /> View Details
                </DropdownMenuItem>
                 <DropdownMenuItem asChild>
                    <Link href={`/admin/users/${user.id}/collection`}>
                        <ShoppingBag className="mr-2 h-4 w-4" /> View Collection
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => editUser(user.id)} disabled>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit User
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteRequest(user)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete User
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </TableCell>
        </TableRow>
      );
    })
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <Input
            placeholder="Search users (name, email)..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="max-w-sm"
          />
          <div className="flex gap-2 flex-wrap sm:ml-auto">
            <Select value={roleFilter} onValueChange={(value) => {setRoleFilter(value); setCurrentPage(1);}}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="User">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => {setStatusFilter(value); setCurrentPage(1);}} disabled>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {paginatedUsers.length === 0 && (
               <div className="text-center h-48 flex items-center justify-center text-muted-foreground">
                 No users match your current filters.
               </div>
            )}

            {paginatedRegularUsers.length > 0 && (
              <div className="p-4">
                <h3 className="font-headline text-xl mb-3 flex items-center">
                  <Users2 className="mr-2 h-5 w-5 text-primary" /> Registered Users
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>User{sortKey === 'name' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}>Role{sortKey === 'role' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden md:table-cell" onClick={() => handleSort('status')}>Status{sortKey === 'status' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell" onClick={() => handleSort('lastLogin')}>Last Seen{sortKey === 'lastLogin' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderUserTableRows(paginatedRegularUsers)}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {paginatedTestUsers.length > 0 && paginatedRegularUsers.length > 0 && (
              <Separator className="my-0" /> 
            )}

            {paginatedTestUsers.length > 0 && (
              <div className="p-4">
                <h3 className="font-headline text-xl mb-3 flex items-center">
                  <TestTubeDiagonal className="mr-2 h-5 w-5 text-primary" /> Test Users
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('name')}>User{sortKey === 'name' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('role')}>Role{sortKey === 'role' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden md:table-cell" onClick={() => handleSort('status')}>Status{sortKey === 'status' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell" onClick={() => handleSort('lastLogin')}>Last Seen{sortKey === 'lastLogin' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {renderUserTableRows(paginatedTestUsers)}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages} ({filteredAndSortedUsers.length} users total)
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
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user 
              <span className="font-semibold"> {userToDelete?.name} ({userToDelete?.email})</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
