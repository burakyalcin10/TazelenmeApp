import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <div className="surface-kpi">
      <div className="mb-3 flex items-center justify-between">
        <div
          className={cn(
            "flex size-12 items-center justify-center rounded-xl",
            tone === "warning" && "bg-amber/20 text-amber-foreground",
            tone === "success" && "bg-primary/10 text-primary",
            tone === "default" && "bg-white text-forest"
          )}
        >
          <Icon className="size-6" />
        </div>
      </div>
      <p className="panel-label mb-1">{title}</p>
      <div className="font-serif text-4xl text-forest">{value}</div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
