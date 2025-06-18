
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserX, AlertTriangle, Loader2 } from "lucide-react";
import type { DisplayUser } from '@/app/(app)/admin/users/page'; // Assuming DisplayUser is still relevant for structure

// Define a simpler type for what we expect from /api/admin/users/all-test for counting purposes
interface TestApiUser {
  id: string;
  email?: string;
  // Add other fields if your /user/admin/all-test endpoint returns more and they are needed
}


const baseRemoveTestUsersSchema = z.object({
  emailPrefix: z.string().min(3, { message: "Email prefix must be at least 3 characters." }),
  emailDomain: z.string().min(3, { message: "Email domain is required." }).includes('.', { message: "Must be a valid domain e.g. example.com" }),
  count: z.coerce.number().int().min(1, { message: "Count must be at least 1." }).max(100, {message: "Cannot remove more than 100 users at a time."}),
});

export type RemoveTestUsersFormInputs = z.infer<typeof baseRemoveTestUsersSchema>;

interface RemoveTestUsersDialogProps {
  onUsersChanged: () => void;
  children: React.ReactNode;
}

export default function RemoveTestUsersDialog({ onUsersChanged, children }: RemoveTestUsersDialogProps) {
  const [mainDialogOpen, setMainDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RemoveTestUsersFormInputs | null>(null);
  const { toast } = useToast();

  const [matchingUsersCount, setMatchingUsersCount] = useState<number | null>(null);
  const [isFetchingMatchingCount, setIsFetchingMatchingCount] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    clearErrors,
    formState: { errors, isSubmitting, isValid: isFormValidForBaseSchema },
  } = useForm<RemoveTestUsersFormInputs>({
    resolver: zodResolver(baseRemoveTestUsersSchema),
    defaultValues: {
      emailPrefix: "testuser",
      emailDomain: "example.com",
      count: 10,
    },
    mode: 'onChange',
  });

  const watchedEmailPrefix = watch("emailPrefix");
  const watchedEmailDomain = watch("emailDomain");
  const watchedCount = watch("count");

  const fetchMatchingTestUsersCount = useCallback(async (prefix: string, domain: string) => {
    if (!prefix || !domain || prefix.length < 3 || !domain.includes('.')) {
      setMatchingUsersCount(null);
      return;
    }
    setIsFetchingMatchingCount(true);
    try {
      // Use the new dedicated API route for fetching only test users
      const response = await fetch('/api/admin/users/all-test', { credentials: 'include', cache: 'no-store' });
      if (!response.ok) {
        if (response.status === 401) {
            toast({ title: "Session Issue", description: "Could not fetch test user data, session may be invalid. Please try refreshing or logging in again.", variant: "destructive" });
        } else {
            toast({ title: "Error", description: `Failed to fetch test user data (status: ${response.status}).`, variant: "destructive" });
        }
        throw new Error(`Failed to fetch test users: ${response.status}`);
      }
      const result = await response.json();
      // Assuming the new endpoint also returns { data: TestApiUser[] }
      const testApiUsers: TestApiUser[] = result.data || [];
      
      // Client-side filtering still needed as /api/admin/users/all-test might return ALL test users,
      // and we need to count only those matching the specific prefix/domain from the form.
      const filtered = testApiUsers.filter(user =>
        user.email?.toLowerCase().startsWith(prefix.toLowerCase()) && user.email?.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
      );
      setMatchingUsersCount(filtered.length);
    } catch (error) {
      console.error("Error fetching matching test users count:", error);
      setMatchingUsersCount(null);
      if (!(error instanceof Error && error.message.includes("Failed to fetch test users"))) {
          toast({ title: "Fetch Error", description: "Could not connect to fetch matching test user count.", variant: "destructive" });
      }
    } finally {
      setIsFetchingMatchingCount(false);
    }
  }, [toast]);

  useEffect(() => {
    if (mainDialogOpen) {
        const handler = setTimeout(() => {
          fetchMatchingTestUsersCount(watchedEmailPrefix, watchedEmailDomain);
        }, 700);
        return () => clearTimeout(handler);
    } else {
      setMatchingUsersCount(null);
      clearErrors("count");
    }
  }, [mainDialogOpen, watchedEmailPrefix, watchedEmailDomain, fetchMatchingTestUsersCount, clearErrors]);


  useEffect(() => {
    if (matchingUsersCount !== null && typeof watchedCount === 'number' && watchedCount > matchingUsersCount) {
      setError("count", {
        type: "manual",
        message: `Cannot remove more than ${matchingUsersCount} existing user(s).`,
      });
    } else if (errors.count?.type === "manual" && (matchingUsersCount === null || (typeof watchedCount === 'number' && watchedCount <= matchingUsersCount))) {
      clearErrors("count");
    }
  }, [watchedCount, matchingUsersCount, setError, clearErrors, errors.count]);


  const onFormSubmit: SubmitHandler<RemoveTestUsersFormInputs> = async (data) => {
    if (matchingUsersCount !== null && data.count > matchingUsersCount) {
      setError("count", {
        type: "manual",
        message: `Cannot remove more than ${matchingUsersCount} existing user(s).`,
      });
      toast({
        title: "Input Error",
        description: `Cannot remove more than ${matchingUsersCount} existing user(s) matching the criteria.`,
        variant: "destructive",
      });
      return;
    }
    setFormData(data);
    setConfirmDialogOpen(true);
  };

  const executeRemoval = async () => {
    if (!formData) return;

    try {
      const response = await fetch('/api/admin/users/remove-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      if (response.status === 204) {
        toast({
          title: "Test Users Removal Processed",
          description: `Removal process for ${formData.count} user(s) matching '${formData.emailPrefix}@${formData.emailDomain}' completed.`,
        });
        onUsersChanged();
        reset();
        setConfirmDialogOpen(false);
        setMainDialogOpen(false);
        setMatchingUsersCount(null);
        return;
      }

      const result = await response.json().catch(() => ({}));

      if (response.ok) {
        let description;
        const deletedCountFromServer = result.deletedCount; // Expecting deletedCount from backend
        const deletedEmails = result.emails;

        if (result.message) {
          description = result.message;
        } else if (typeof deletedCountFromServer === 'number' && deletedCountFromServer > 0) {
          description = `Successfully removed ${deletedCountFromServer} test user(s) matching '${formData.emailPrefix}@${formData.emailDomain}'.`;
          if (Array.isArray(deletedEmails) && deletedEmails.length > 0 && deletedEmails.length <= 3) {
            description += ` Emails: ${deletedEmails.join(', ')}.`;
          } else if (Array.isArray(deletedEmails) && deletedEmails.length > 3) {
            description += ` First 3 removed: ${deletedEmails.slice(0,3).join(', ')}...`;
          }
        } else if (typeof deletedCountFromServer === 'number' && deletedCountFromServer === 0) {
          description = `No test users found matching '${formData.emailPrefix}@${formData.emailDomain}' to remove. 0 users were deleted.`;
        } else {
          description = `Test user removal process for prefix '${formData.emailPrefix}@${formData.emailDomain}' completed. Please verify in server logs.`;
        }
        toast({
          title: "Test Users Removal Processed",
          description: description,
        });
        onUsersChanged();
        reset();
        setConfirmDialogOpen(false);
        setMainDialogOpen(false);
        setMatchingUsersCount(null);
      } else {
        toast({
          title: "Failed to Remove Test Users",
          description: result.message || result.details || "An unknown error occurred.",
          variant: "destructive",
        });
        setConfirmDialogOpen(false);
      }
    } catch (error) {
      console.error("Failed to remove test users:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to remove test users.",
        variant: "destructive",
      });
      setConfirmDialogOpen(false);
    }
  };

  const isSubmitDisabled = isSubmitting || isFetchingMatchingCount || (matchingUsersCount !== null && typeof watchedCount === 'number' && watchedCount > matchingUsersCount) || !isFormValidForBaseSchema || errors.count?.type === 'manual';


  return (
    <>
      <Dialog open={mainDialogOpen} onOpenChange={(isOpen) => {
        setMainDialogOpen(isOpen);
        if (!isOpen) {
           setMatchingUsersCount(null);
           clearErrors("count");
        } else {
            if (watchedEmailPrefix && watchedEmailDomain && watchedEmailPrefix.length >=3 && watchedEmailDomain.includes('.')) {
                fetchMatchingTestUsersCount(watchedEmailPrefix, watchedEmailDomain);
            }
        }
      }}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <UserX className="mr-2 h-5 w-5" /> Remove Last N Test Users
            </DialogTitle>
            <DialogDescription>
              Specify email prefix, domain, and count of most recent test users to remove. This action is irreversible.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailPrefix-remove-test">Email Prefix</Label>
              <Controller
                  name="emailPrefix"
                  control={control}
                  render={({ field }) => <Input id="emailPrefix-remove-test" {...field} placeholder="e.g. testuser" disabled={isSubmitting || isFetchingMatchingCount} />}
              />
              {errors.emailPrefix && <p className="text-xs text-destructive mt-1">{errors.emailPrefix.message}</p>}
            </div>
            <div>
              <Label htmlFor="emailDomain-remove-test">Email Domain</Label>
              <Controller
                  name="emailDomain"
                  control={control}
                  render={({ field }) => <Input id="emailDomain-remove-test" {...field} placeholder="e.g. example.com" disabled={isSubmitting || isFetchingMatchingCount} />}
              />
              {errors.emailDomain && <p className="text-xs text-destructive mt-1">{errors.emailDomain.message}</p>}
            </div>

            <div>
              <Label htmlFor="count-remove-test">Number of Users to Remove</Label>
              <Controller
                  name="count"
                  control={control}
                  render={({ field }) => <Input id="count-remove-test" type="number" {...field} placeholder="e.g. 10" disabled={isSubmitting || isFetchingMatchingCount} />}
              />
              {isFetchingMatchingCount && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" /> Fetching matching user count...
                </p>
              )}
              {!isFetchingMatchingCount && matchingUsersCount !== null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Found {matchingUsersCount} test user(s) matching "{watchedEmailPrefix}@{watchedEmailDomain}".
                </p>
              )}
               {!isFetchingMatchingCount && matchingUsersCount === null && watchedEmailPrefix && watchedEmailDomain && watchedEmailPrefix.length >=3 && watchedEmailDomain.includes('.') && (
                <p className="text-xs text-muted-foreground mt-1">Could not determine matching user count. Ensure prefix/domain are valid or check connection.</p>
              )}
              {errors.count && <p className="text-xs text-destructive mt-1">{errors.count.message}</p>}
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              The "Found X user(s)" count reflects users matching the prefix/domain. The removal targets the N most recently created users adhering to this pattern.
            </p>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isSubmitDisabled}>
                {isSubmitting ? "Processing..." : "Remove Users"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" /> Confirm Removal
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the last {formData?.count} user(s) matching the prefix
              <span className="font-semibold"> {formData?.emailPrefix}@</span>
              <span className="font-semibold">{formData?.emailDomain}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeRemoval} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? "Removing..." : "Yes, Remove Users"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    