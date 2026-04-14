import { FileSearch } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-secondary text-primary">
        <FileSearch className="size-6" />
      </div>
      <div className="space-y-2">
        <h3 className="font-serif text-xl font-semibold text-forest">{title}</h3>
        <p className="mx-auto max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {actionLabel && onAction ? (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
