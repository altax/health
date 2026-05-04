import { useGetLogs } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Utensils, Droplets, Moon, Activity, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export default function HistoryPage() {
  const { data: logs, isLoading } = useGetLogs({ limit: 30 });

  if (isLoading) {
    return <div className="space-y-3">{[1,2,3,4,5].map((i) => <Skeleton key={i} className="h-24" />)}</div>;
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">История дневника</h1>
        <p className="text-muted-foreground text-sm">Последние 30 дней записей</p>
      </div>

      {!logs || logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium">Записей пока нет</p>
            <p className="text-sm text-muted-foreground mt-1">Начните вести дневник питания, воды и сна.</p>
            <Link href="/log">
              <button className="mt-4 text-sm text-primary underline underline-offset-2">Перейти в дневник</button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const calories = log.totalNutrients?.calories ?? 0;
            const protein = log.totalNutrients?.protein ?? 0;
            const waterPct = Math.min((log.waterMl / 2000) * 100, 100);
            const sleepH = (log.sleep as { durationHours?: number } | null)?.durationHours;
            const actCount = log.activityEntries?.length ?? 0;
            const foodCount = log.foodEntries?.length ?? 0;
            const dateDisplay = new Date(log.date + "T12:00:00").toLocaleDateString("ru", {
              weekday: "short", day: "numeric", month: "short",
            });

            return (
              <Link key={log.id} href={`/log/${log.date}`}>
                <Card className="hover:bg-muted/30 transition-colors cursor-pointer">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="min-w-[90px]">
                          <div className="font-medium text-sm capitalize">{dateDisplay}</div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Utensils className="h-3 w-3" />{foodCount} блюд · {Math.round(calories)} ккал · {Math.round(protein)}г белка
                          </span>
                          <span className="flex items-center gap-1">
                            <Droplets className="h-3 w-3 text-blue-400" />{Math.round(log.waterMl)} мл
                          </span>
                          {sleepH != null && (
                            <span className="flex items-center gap-1">
                              <Moon className="h-3 w-3 text-indigo-400" />{sleepH} ч
                            </span>
                          )}
                          {actCount > 0 && (
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3 text-emerald-400" />{actCount} трен.
                            </span>
                          )}
                        </div>
                        <div className="flex md:hidden gap-1.5">
                          {foodCount > 0 && <Badge variant="secondary" className="text-xs">{Math.round(calories)} ккал</Badge>}
                          {sleepH != null && <Badge variant="secondary" className="text-xs">{sleepH}ч сна</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="hidden md:block w-20">
                          <div className="text-xs text-muted-foreground mb-0.5">Вода</div>
                          <Progress value={waterPct} className="h-1.5" />
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
