import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
  active = false,
  onClick,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success";
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="panel-label">{title}</p>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "warning" && "bg-amber/15 text-amber-foreground",
            tone === "success" && "bg-primary/10 text-primary",
            tone === "default" && "bg-secondary text-forest"
          )}
        >
          <Icon className="size-[18px]" />
        </div>
      </div>
      <div className="mt-2 font-serif text-3xl font-bold tracking-tight text-[color:var(--blue-800)]">
        {value}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-active={active}
        className={cn(
          "surface-kpi w-full text-left transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20",
          active && "border-primary/45 bg-primary/[0.03] ring-2 ring-primary/15"
        )}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="surface-kpi">
      {content}
    </div>
  );
}
