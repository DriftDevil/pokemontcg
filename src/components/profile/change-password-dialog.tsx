
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
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { KeyRound } from "lucide-react";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(8, "New password must be at least 8 characters."),
  confirmNewPassword: z.string().min(1, "Please confirm your new password."),
})
.refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"], // Show error on confirmNewPassword field
});

type ChangePasswordFormInputs = z.infer<typeof changePasswordSchema>;

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormInputs>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    }
  });

  const onSubmit: SubmitHandler<ChangePasswordFormInputs> = async (data) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
        credentials: 'include',
      });

      if (response.status === 204) {
        toast({
          title: "Password Changed Successfully",
          description: "Your password has been updated.",
        });
        reset();
        onOpenChange(false);
        // Optionally, you might want to redirect to login or inform the user their session might be invalidated.
        // For now, just close the dialog.
      } else {
        const result = await response.json().catch(() => ({ message: "An unknown error occurred."}));
        let description = result.message || result.details || "An unknown error occurred.";
        if (response.status === 401) {
            description = "Your current password was incorrect or your session is invalid.";
        } else if (response.status === 400) {
            description = "The new password might not meet requirements or the request was malformed.";
        }
        toast({
          title: "Failed to Change Password",
          description: description,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Failed to change password:", error);
      toast({
        title: "Network Error",
        description: "Could not connect to the server to change password.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        reset(); // Reset form when dialog is closed
      }
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <KeyRound className="mr-2 h-5 w-5" /> Change Your Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password and a new password below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div>
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              {...register("currentPassword")}
              disabled={isSubmitting}
              className={errors.currentPassword ? "border-destructive" : ""}
            />
            {errors.currentPassword && <p className="text-xs text-destructive mt-1">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              disabled={isSubmitting}
              className={errors.newPassword ? "border-destructive" : ""}
            />
            {errors.newPassword && <p className="text-xs text-destructive mt-1">{errors.newPassword.message}</p>}
          </div>
          <div>
            <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
            <Input
              id="confirmNewPassword"
              type="password"
              {...register("confirmNewPassword")}
              disabled={isSubmitting}
              className={errors.confirmNewPassword ? "border-destructive" : ""}
            />
            {errors.confirmNewPassword && <p className="text-xs text-destructive mt-1">{errors.confirmNewPassword.message}</p>}
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
