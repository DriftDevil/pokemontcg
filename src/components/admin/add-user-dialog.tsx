
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
import { Checkbox } from "@/components/ui/checkbox";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  name: z.string().optional(),
  preferredUsername: z.string().min(3, { message: "Preferred username must be at least 3 characters."}).optional(),
  isAdmin: z.boolean().default(false),
});

export type AddUserFormInputs = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  onUserAdded: () => void;
  children: React.ReactNode;
}

export default function AddUserDialog({ onUserAdded, children }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormInputs>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      preferredUsername: '',
      isAdmin: false,
    }
  });

  const onSubmit: SubmitHandler<AddUserFormInputs> = async (data) => {
    // Filter out empty optional fields so they are not sent as empty strings
    const payload: Partial<AddUserFormInputs> = { ...data };
    if (!payload.name) delete payload.name;
    if (!payload.preferredUsername) delete payload.preferredUsername;

    try {
      const response = await fetch('/api/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "User Added",
          description: `User ${result.data?.email || data.email} has been successfully added.`,
        });
        onUserAdded();
        reset();
        setOpen(false);
      } else {
        let description = result.message || result.details || "An unknown error occurred.";
        if (response.status === 401) {
            description = "Unauthorized. Your session may have expired. Please log in again.";
        }
        toast({
          title: "Failed to Add User",
          description: description,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to add user:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to add user.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        reset();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="mr-2 h-5 w-5" /> Add New User
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new user account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="name-add">Full Name (Optional)</Label>
            <Controller
                name="name"
                control={control}
                render={({ field }) => <Input id="name-add" {...field} placeholder="e.g. John Doe" disabled={isSubmitting} />}
            />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="preferredUsername-add">Preferred Username (Optional)</Label>
            <Controller
                name="preferredUsername"
                control={control}
                render={({ field }) => <Input id="preferredUsername-add" {...field} placeholder="e.g. johndoe" disabled={isSubmitting} />}
            />
            {errors.preferredUsername && <p className="text-xs text-destructive mt-1">{errors.preferredUsername.message}</p>}
          </div>
          <div>
            <Label htmlFor="email-add">Email Address</Label>
             <Controller
                name="email"
                control={control}
                render={({ field }) => <Input id="email-add" type="email" {...field} placeholder="user@example.com" disabled={isSubmitting} />}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password-add">Password</Label>
            <Controller
                name="password"
                control={control}
                render={({ field }) => <Input id="password-add" type="password" {...field} placeholder="••••••••" disabled={isSubmitting} />}
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <Controller
              name="isAdmin"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isAdmin-add"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
            <Label htmlFor="isAdmin-add" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Grant Administrator Privileges
            </Label>
          </div>
          {errors.isAdmin && <p className="text-xs text-destructive mt-1">{errors.isAdmin.message}</p>}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding User..." : "Add User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
