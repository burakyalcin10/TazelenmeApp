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
    <div className="flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-dashed border-border bg-white/80 px-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-secondary text-primary">
        <FileSearch className="size-7" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mx-auto max-w-xl text-base leading-7 text-muted-foreground">{description}</p>
      </div>
      {actionLabel && onAction ? (
        <Button size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
