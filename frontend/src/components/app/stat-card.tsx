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
    <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
      <CardHeader className="items-start gap-4">
        <div
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl",
            tone === "warning" && "bg-amber-100 text-amber-700",
            tone === "success" && "bg-emerald-100 text-emerald-700",
            tone === "default" && "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-7" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold text-muted-foreground">{title}</CardTitle>
          <div className="text-4xl font-semibold tracking-tight text-foreground">{value}</div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-base leading-7 text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
