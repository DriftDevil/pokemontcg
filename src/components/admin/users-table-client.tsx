
"use client";

import React, { useState, useMemo } from 'react';
import type { DisplayUser as User } from '@/app/(app)/admin/users/page'; // Use DisplayUser as User
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpDown, MoreHorizontal, Trash2, Edit3, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface UsersTableClientProps {
  initialUsers: User[];
}

type SortKey = keyof User | '';
type SortDirection = 'asc' | 'desc';

export default function UsersTableClient({ initialUsers }: UsersTableClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers); // Users are now DisplayUser
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // Status filter will work on the default "Active" status for now
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Increased items per page

  React.useEffect(() => {
    setUsers(initialUsers); // Update users if initialUsers prop changes
    setCurrentPage(1); // Reset to first page on new data
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

    if (sortKey) {
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

  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
      // Add other statuses if they become available from API
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

  const viewUser = (userId: string) => alert(`View user: ${userId} (Not implemented)`);
  const editUser = (userId: string) => alert(`Edit user: ${userId} (Not implemented)`);
  const deleteUser = (userId: string) => {
    if(confirm(`Are you sure you want to delete user ${userId}? (This is a mock client-side delete for now)`)) {
      // Mock delete: setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      alert(`Delete user: ${userId} (Not implemented on backend)`);
    }
  };


  return (
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
          <Select value={statusFilter} onValueChange={(value) => {setStatusFilter(value); setCurrentPage(1);}} disabled> {/* Disabled until API provides status */}
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              {/* <SelectItem value="Inactive">Inactive</SelectItem> */}
              {/* <SelectItem value="Pending">Pending</SelectItem> */}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('name')}
              >
                User
                {sortKey === 'name' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleSort('role')}
              >
                Role
                {sortKey === 'role' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 hidden md:table-cell"
                onClick={() => handleSort('status')}
              >
                Status
                {sortKey === 'status' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-muted/50 hidden lg:table-cell"
                onClick={() => handleSort('lastLogin')}
              >
                Last Seen
                {sortKey === 'lastLogin' && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage 
                        src={user.avatar} 
                        alt={user.name} 
                        data-ai-hint="user avatar placeholder"
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
                  {user.lastLogin ? format(parseISO(user.lastLogin), 'MMM d, yyyy, p') : 'N/A'}
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
                      <DropdownMenuItem onClick={() => viewUser(user.id)}>
                        <Eye className="mr-2 h-4 w-4" /> View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => editUser(user.id)} disabled>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit User
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => deleteUser(user.id)} disabled>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
             {paginatedUsers.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                  No users match your current filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
  );
}
