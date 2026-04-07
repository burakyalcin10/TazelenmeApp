import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

export function LoadingBlock({
  className,
  description = "Veriler yukleniyor...",
}: {
  className?: string;
  description?: string;
}) {
  return (
    <div className={cn("flex min-h-[40vh] items-center justify-center p-8", className)}>
      <div className="flex max-w-sm flex-col items-center gap-4 rounded-3xl bg-white/90 px-8 py-10 text-center shadow-sm ring-1 ring-foreground/10">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Loader2 className="size-8 animate-spin" />
        </div>
        <p className="text-balance-soft text-lg font-semibold text-foreground">{description}</p>
      </div>
    </div>
  );
}
