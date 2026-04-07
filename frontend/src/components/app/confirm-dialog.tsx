"use client";

import { AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "Vazgec",
  destructive = false,
  loading = false,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default" className="max-w-lg rounded-[2rem] p-6">
        <AlertDialogHeader className="place-items-start text-left">
          <AlertDialogMedia className={destructive ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>
            <AlertTriangle className="size-6" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-2xl font-semibold">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-base leading-7">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 bg-transparent px-0 pb-0">
          <AlertDialogCancel size="lg">{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            size="lg"
            variant={destructive ? "destructive" : "default"}
            disabled={loading}
            onClick={onConfirm}
          >
            {loading ? "Isleniyor..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
