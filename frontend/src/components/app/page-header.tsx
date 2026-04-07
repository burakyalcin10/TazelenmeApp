import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 rounded-[2rem] bg-white/90 p-6 shadow-sm ring-1 ring-foreground/10 lg:flex-row lg:items-center lg:justify-between", className)}>
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
