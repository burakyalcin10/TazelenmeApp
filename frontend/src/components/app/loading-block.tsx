import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingBlock({
  className,
  description = "Veriler yükleniyor...",
}: {
  className?: string;
  description?: string;
}) {
  return (
    <div className={cn("flex min-h-[40vh] items-center justify-center p-8", className)}>
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-xl bg-white px-8 py-10 text-center ghost-border">
        <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-7 animate-spin" />
        </div>
        <p className="text-lg font-semibold text-foreground">{description}</p>
      </div>
    </div>
  );
}
