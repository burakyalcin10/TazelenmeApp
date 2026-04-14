import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AttendanceTrendChart({
  title,
  description,
  data,
}: {
  title: string;
  description: string;
  data: {
    weekNumber: number;
    attendanceRate: number;
    classroom: string;
  }[];
}) {
  return (
    <div className="surface-card">
      <div className="mb-6">
        <h3 className="font-serif text-2xl text-forest">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="rounded-xl bg-muted/60 px-5 py-6 text-sm text-muted-foreground">
            Grafik gösterimi için önce bir ders seçin veya bu ders için oturum oluşturun.
          </div>
        ) : (
          data.map((item) => (
            <div key={item.weekNumber} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    Hafta {item.weekNumber}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">
                    {item.classroom}
                  </div>
                </div>
                <div className="font-serif text-lg font-semibold text-forest">
                  {item.attendanceRate}%
                </div>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    item.attendanceRate >= 70 ? "bg-primary" : "bg-amber"
                  )}
                  style={{ width: `${Math.max(item.attendanceRate, 8)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
