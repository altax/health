import { useGetRecommendations } from "@workspace/api-client-react";
import type { Recommendation } from "@workspace/api-client-react";
import { AlertCircle, Shield, Zap, Target, Settings, TrendingUp, Beaker, Heart, Moon, Activity, Droplets, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield; border: string }> = {
  safety:        { label: "Безопасность",   color: "text-red-500",            icon: Shield,     border: "border-red-500/30 bg-red-500/5" },
  deficiency:    { label: "Дефицит",        color: "text-amber-500",          icon: AlertCircle,border: "border-amber-500/30 bg-amber-500/5" },
  stabilization: { label: "Стабилизация",   color: "text-orange-500",         icon: Zap,        border: "border-orange-500/30 bg-orange-500/5" },
  optimization:  { label: "Оптимизация",    color: "text-blue-500",           icon: Target,     border: "border-blue-500/20" },
  fine_tuning:   { label: "Тонкая настройка", color: "text-indigo-500",       icon: Settings,   border: "border-indigo-500/20" },
  long_term:     { label: "Долгосрочно",    color: "text-muted-foreground",   icon: TrendingUp, border: "" },
};

const CATEGORY_ICON: Record<string, typeof Shield> = {
  nutrition: Activity, hydration: Droplets, sleep: Moon, activity: Activity,
  labs: Beaker, supplements: Pill, lifestyle: Heart,
};

const CATEGORY_LABEL: Record<string, string> = {
  nutrition: "питание", hydration: "гидратация", sleep: "сон",
  activity: "активность", labs: "анализы", supplements: "добавки", lifestyle: "образ жизни",
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high:     "Высокая достоверность",
  medium:   "Средняя достоверность",
  low:      "Низкая достоверность",
  very_low: "Очень низкая достоверность",
};

function RecCard({ rec }: { rec: Recommendation }) {
  const pConfig = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.long_term;
  const PIcon = pConfig.icon;
  const CIcon = CATEGORY_ICON[rec.category] ?? Activity;

  return (
    <Card className={`transition-all ${pConfig.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <PIcon className={`h-4 w-4 shrink-0 ${pConfig.color}`} />
            <CardTitle className="text-base leading-tight">{rec.title}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge variant="secondary" className="text-xs">
              <CIcon className="h-3 w-3 mr-1" />{CATEGORY_LABEL[rec.category] ?? rec.category}
            </Badge>
            <Badge variant="outline" className={`text-xs ${pConfig.color}`}>{pConfig.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Выявлено</div>
          <p>{rec.finding}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Почему важно</div>
          <p className="text-muted-foreground">{rec.importance}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs font-medium mb-1">Сегодня</div>
            <p className="text-xs">{rec.actionToday}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs font-medium mb-1">На этой неделе</div>
            <p className="text-xs">{rec.actionWeek}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Пересмотр: {rec.reviewIn}</span>
          <span>{CONFIDENCE_LABEL[rec.confidence] ?? rec.confidence}</span>
        </div>
        {rec.dataNeeded && (
          <div className="text-xs text-blue-500 bg-blue-500/5 rounded-md px-3 py-2">
            Нужны данные: {rec.dataNeeded}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RecommendationsPage() {
  const { data: recs, isLoading } = useGetRecommendations();

  if (isLoading) {
    return <div className="space-y-4">{[1,2,3].map((i) => <Skeleton key={i} className="h-48" />)}</div>;
  }

  const priorityOrder = ["safety", "deficiency", "stabilization", "optimization", "fine_tuning", "long_term"];
  const sorted = [...(recs ?? [])].sort((a, b) =>
    priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority)
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Рекомендации</h1>
        <p className="text-muted-foreground text-sm">
          {sorted.length} рекомендаций, приоритизированных по безопасности и влиянию
        </p>
      </div>
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium">Рекомендаций пока нет</p>
            <p className="text-sm text-muted-foreground mt-1">Заполняйте дневник питания, сна и активности для получения персональных рекомендаций.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((r) => <RecCard key={r.id} rec={r} />)}
        </div>
      )}
    </div>
  );
}
