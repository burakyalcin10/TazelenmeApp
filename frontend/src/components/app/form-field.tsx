import type { ReactNode } from "react";

import { Label } from "@/components/ui/label";

export function FormField({
  label,
  description,
  htmlFor,
  children,
}: {
  label: string;
  description?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <div className="space-y-1">
        <Label htmlFor={htmlFor} className="text-base font-semibold">
          {label}
        </Label>
        {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}
