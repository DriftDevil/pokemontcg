
"use client";

import React, { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { TestTubeDiagonal } from "lucide-react";

const addTestUsersSchema = z.object({
  baseName: z.string().min(1, { message: "Base name is required." }),
  count: z.coerce.number().int().min(1, { message: "Count must be at least 1." }).max(20, { message: "Cannot add more than 20 test users at a time." }),
  emailPrefix: z.string().min(3, { message: "Email prefix must be at least 3 characters." }).regex(/^[a-zA-Z0-9_.-]+$/, { message: "Prefix can only contain letters, numbers, underscores, dots, or hyphens." }),
  emailDomain: z.string().min(3, { message: "Email domain is required." }).includes('.', { message: "Must be a valid domain e.g. example.com" }),
});

export type AddTestUsersFormInputs = z.infer<typeof addTestUsersSchema>;

interface AddTestUsersDialogProps {
  onUsersChanged: () => void;
  children: React.ReactNode;
}

export default function AddTestUsersDialog({ onUsersChanged, children }: AddTestUsersDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddTestUsersFormInputs>({
    resolver: zodResolver(addTestUsersSchema),
    defaultValues: {
      baseName: "Test User",
      count: 5,
      emailPrefix: "testuser",
      emailDomain: "example.com",
    }
  });

  const onSubmit: SubmitHandler<AddTestUsersFormInputs> = async (data) => {
    try {
      const response = await fetch('/api/admin/users/add-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const result = await response.json();

      if (response.ok) {
        let description = result.message;
        if (!description) {
          const createdCount = result.count || 0;
          const skippedCount = result.skipped || 0;
          const startIndex = result.startIndex;
          const endIndex = result.endIndex;

          if (createdCount > 0) {
            description = `Successfully created ${createdCount} test user(s)`;
            if (typeof startIndex === 'number' && typeof endIndex === 'number' && endIndex >= startIndex) {
              description += ` (${data.emailPrefix}${startIndex} - ${data.emailPrefix}${endIndex}@${data.emailDomain})`;
            }
            description += ".";
          } else {
            description = "No new test users were created.";
          }

          if (skippedCount > 0) {
            description += ` Skipped ${skippedCount} user(s) due to existing emails.`;
          }
        }

        toast({
          title: "Add Test Users Processed",
          description: description,
        });
        onUsersChanged();
        reset(); // Reset form to defaults
        setOpen(false);
      } else {
        toast({
          title: "Failed to Add Test Users",
          description: result.message || result.details || "An unknown error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add test users:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to add test users.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        // Do not reset here if we want to keep default values upon reopening
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TestTubeDiagonal className="mr-2 h-5 w-5" /> Add Batch of Test Users
          </DialogTitle>
          <DialogDescription>
            Create multiple test user accounts with sequential naming and email addresses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="baseName-add-test">Base Name</Label>
            <Controller
                name="baseName"
                control={control}
                render={({ field }) => <Input id="baseName-add-test" {...field} placeholder="e.g. Automated Tester" disabled={isSubmitting} />}
            />
            {errors.baseName && <p className="text-xs text-destructive mt-1">{errors.baseName.message}</p>}
          </div>
          <div>
            <Label htmlFor="count-add-test">Number of Users</Label>
            <Controller
                name="count"
                control={control}
                render={({ field }) => <Input id="count-add-test" type="number" {...field} placeholder="e.g. 5" disabled={isSubmitting} />}
            />
            {errors.count && <p className="text-xs text-destructive mt-1">{errors.count.message}</p>}
          </div>
          <div>
            <Label htmlFor="emailPrefix-add-test">Email Prefix</Label>
            <Controller
                name="emailPrefix"
                control={control}
                render={({ field }) => <Input id="emailPrefix-add-test" {...field} placeholder="e.g. testuser" disabled={isSubmitting} />}
            />
            {errors.emailPrefix && <p className="text-xs text-destructive mt-1">{errors.emailPrefix.message}</p>}
          </div>
          <div>
            <Label htmlFor="emailDomain-add-test">Email Domain</Label>
            <Controller
                name="emailDomain"
                control={control}
                render={({ field }) => <Input id="emailDomain-add-test" {...field} placeholder="e.g. example.com" disabled={isSubmitting} />}
            />
            {errors.emailDomain && <p className="text-xs text-destructive mt-1">{errors.emailDomain.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding Users..." : "Add Test Users"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

