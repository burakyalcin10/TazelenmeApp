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
    <div
      className={cn(
        "flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="space-y-2">
        <h1 className="font-serif text-3xl text-forest sm:text-4xl">{title}</h1>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
