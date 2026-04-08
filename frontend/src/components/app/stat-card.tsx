import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0.48),transparent)]" />
      <CardHeader className="items-start gap-4">
        <div
          className={cn(
            "flex size-15 items-center justify-center rounded-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]",
            tone === "warning" && "bg-amber-100/90 text-amber-700",
            tone === "success" && "bg-emerald-100/90 text-emerald-700",
            tone === "default" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {title}
          </CardTitle>
          <div className="text-[2.6rem] font-semibold tracking-tight text-foreground">{value}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-7 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
