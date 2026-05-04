import { useGetRecommendations } from "@workspace/api-client-react";
import type { Recommendation } from "@workspace/api-client-react";
import { AlertCircle, Shield, Zap, Target, Settings, TrendingUp, Beaker, Heart, Moon, Activity, Droplets, Pill } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield; border: string }> = {
  safety:       { label: "Safety", color: "text-red-500",     icon: Shield,     border: "border-red-500/30 bg-red-500/5" },
  deficiency:   { label: "Deficiency", color: "text-amber-500",  icon: AlertCircle, border: "border-amber-500/30 bg-amber-500/5" },
  stabilization:{ label: "Stabilization", color: "text-orange-500", icon: Zap,      border: "border-orange-500/30 bg-orange-500/5" },
  optimization: { label: "Optimization", color: "text-blue-500",  icon: Target,   border: "border-blue-500/20" },
  fine_tuning:  { label: "Fine-tuning", color: "text-indigo-500", icon: Settings, border: "border-indigo-500/20" },
  long_term:    { label: "Long-term", color: "text-muted-foreground", icon: TrendingUp, border: "" },
};

const CATEGORY_ICON: Record<string, typeof Shield> = {
  nutrition: Activity, hydration: Droplets, sleep: Moon, activity: Activity,
  labs: Beaker, supplements: Pill, lifestyle: Heart,
};

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "High confidence", medium: "Medium confidence", low: "Low confidence", very_low: "Very low confidence",
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
            <Badge variant="secondary" className="text-xs capitalize">
              <CIcon className="h-3 w-3 mr-1" />{rec.category.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className={`text-xs ${pConfig.color}`}>{pConfig.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Finding</div>
          <p>{rec.finding}</p>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Why it matters</div>
          <p className="text-muted-foreground">{rec.importance}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs font-medium mb-1">Do today</div>
            <p className="text-xs">{rec.actionToday}</p>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <div className="text-xs font-medium mb-1">This week</div>
            <p className="text-xs">{rec.actionWeek}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Review in: {rec.reviewIn}</span>
          <span>{CONFIDENCE_LABEL[rec.confidence] ?? rec.confidence}</span>
        </div>
        {rec.dataNeeded && (
          <div className="text-xs text-blue-500 bg-blue-500/5 rounded-md px-3 py-2">
            Data needed: {rec.dataNeeded}
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
        <h1 className="text-2xl font-bold tracking-tight">Recommendations</h1>
        <p className="text-muted-foreground text-sm">
          {sorted.length} action{sorted.length !== 1 ? "s" : ""} prioritized by safety and impact
        </p>
      </div>
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium">No recommendations yet</p>
            <p className="text-sm text-muted-foreground mt-1">Log food, sleep, and activities to generate personalized insights.</p>
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
