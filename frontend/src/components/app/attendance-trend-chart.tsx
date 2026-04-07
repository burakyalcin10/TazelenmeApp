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
    <Card className="rounded-[2rem] border-0 shadow-sm ring-1 ring-foreground/10">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">{title}</CardTitle>
        <p className="text-base leading-7 text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        {data.length === 0 ? (
          <div className="rounded-[1.5rem] bg-muted/60 px-5 py-6 text-base text-muted-foreground">
            Grafik gosterimi icin once bir ders secin veya bu ders icin oturum olusturun.
          </div>
        ) : (
          data.map((item) => (
            <div key={item.weekNumber} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-base font-semibold">Hafta {item.weekNumber}</div>
                  <div className="truncate text-sm text-muted-foreground">{item.classroom}</div>
                </div>
                <div className="text-lg font-semibold">{item.attendanceRate}%</div>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    item.attendanceRate >= 70 ? "bg-emerald-500" : "bg-amber-500"
                  )}
                  style={{ width: `${Math.max(item.attendanceRate, 8)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
