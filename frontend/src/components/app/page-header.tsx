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
        "surface-panel-strong flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <div className="space-y-3">
        <div className="panel-label">Yonetim Alani</div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[2.2rem]">{title}</h1>
        <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
