
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
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";

const addUserSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
  name: z.string().optional(),
  isAdmin: z.boolean().default(false).optional(),
});

export type AddUserFormInputs = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  sessionToken: string | undefined;
  onUserAdded: () => void; // Callback to refresh user list
  children: React.ReactNode; // To use as DialogTrigger
}

export default function AddUserDialog({ sessionToken, onUserAdded, children }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddUserFormInputs>({
    resolver: zodResolver(addUserSchema),
  });

  const onSubmit: SubmitHandler<AddUserFormInputs> = async (data) => {
    if (!sessionToken) {
      toast({
        title: "Authentication Error",
        description: "Session token is missing. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch('/api/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "User Added",
          description: `User ${result.data?.email || data.email} has been successfully added.`,
        });
        onUserAdded(); // Trigger refresh
        reset();
        setOpen(false);
      } else {
        toast({
          title: "Failed to Add User",
          description: result.message || result.details || "An unknown error occurred.",
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
        reset(); // Reset form when dialog is closed
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
            <Input id="name-add" {...register("name")} disabled={isSubmitting} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <Label htmlFor="email-add">Email Address</Label>
            <Input id="email-add" type="email" {...register("email")} disabled={isSubmitting} />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <Label htmlFor="password-add">Password</Label>
            <Input id="password-add" type="password" {...register("password")} disabled={isSubmitting} />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="isAdmin-add" {...register("isAdmin")} disabled={isSubmitting} />
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
