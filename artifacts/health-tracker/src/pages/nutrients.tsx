import { useState } from "react";
import { useGetNutrientAnalysis, getGetNutrientAnalysisQueryKey } from "@workspace/api-client-react";
import type { NutrientStatus } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  normal: { label: "Normal", color: "text-emerald-500", icon: CheckCircle2, badgeVariant: "default" },
  likely_deficient: { label: "Likely Low", color: "text-red-500", icon: AlertCircle, badgeVariant: "destructive" },
  possibly_deficient: { label: "Possibly Low", color: "text-amber-500", icon: AlertTriangle, badgeVariant: "outline" },
  likely_excess: { label: "Likely Excess", color: "text-red-500", icon: AlertCircle, badgeVariant: "destructive" },
  possibly_excess: { label: "Possibly Excess", color: "text-amber-500", icon: AlertTriangle, badgeVariant: "outline" },
  insufficient_data: { label: "No Data", color: "text-muted-foreground", icon: HelpCircle, badgeVariant: "secondary" },
  needs_biomarker: { label: "Needs Lab", color: "text-blue-500", icon: HelpCircle, badgeVariant: "secondary" },
};

const CONFIDENCE_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: "High confidence", color: "text-emerald-600" },
  medium: { label: "Medium confidence", color: "text-amber-600" },
  low: { label: "Low confidence", color: "text-orange-500" },
  very_low: { label: "Very low confidence", color: "text-muted-foreground" },
};

const NUTRIENT_LABELS: Record<string, string> = {
  calories: "Calories", protein: "Protein", fat: "Total Fat", carbs: "Carbohydrates",
  fiber: "Fiber", sugar: "Sugar", sodium: "Sodium", potassium: "Potassium",
  calcium: "Calcium", magnesium: "Magnesium", iron: "Iron", zinc: "Zinc",
  vitaminA: "Vitamin A", vitaminC: "Vitamin C", vitaminD: "Vitamin D", vitaminE: "Vitamin E",
  vitaminK: "Vitamin K", vitaminB1: "Vitamin B1 (Thiamine)", vitaminB2: "Vitamin B2 (Riboflavin)",
  vitaminB3: "Vitamin B3 (Niacin)", vitaminB6: "Vitamin B6", vitaminB12: "Vitamin B12",
  folate: "Folate", omega3: "Omega-3", saturatedFat: "Saturated Fat", cholesterol: "Cholesterol",
};

const GROUPS: Record<string, string[]> = {
  "Macros": ["calories", "protein", "fat", "carbs", "fiber", "sugar", "saturatedFat", "cholesterol"],
  "Minerals": ["sodium", "potassium", "calcium", "magnesium", "iron", "zinc"],
  "Vitamins": ["vitaminA", "vitaminC", "vitaminD", "vitaminE", "vitaminK", "vitaminB1", "vitaminB2", "vitaminB3", "vitaminB6", "vitaminB12", "folate"],
  "Fatty Acids": ["omega3"],
};

function NutrientCard({ n }: { n: NutrientStatus }) {
  const status = STATUS_CONFIG[n.status] ?? STATUS_CONFIG.insufficient_data;
  const confidence = CONFIDENCE_CONFIG[n.confidence] ?? CONFIDENCE_CONFIG.very_low;
  const Icon = status.icon;
  const pct = Math.min(n.percentOfTarget, 130);

  let barColor = "bg-emerald-500";
  if (n.status === "likely_deficient" || n.status === "possibly_deficient") barColor = "bg-amber-400";
  if (n.status === "likely_excess" || n.status === "possibly_excess") barColor = "bg-red-400";
  if (n.status === "insufficient_data") barColor = "bg-muted";

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-0">
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${status.color}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium text-sm">{NUTRIENT_LABELS[n.nutrient] ?? n.nutrient}</span>
          <Badge variant={status.badgeVariant} className="text-xs ml-2">{status.label}</Badge>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums w-12 text-right">
            {n.percentOfTarget}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {n.averageIntake} / {n.target} {n.unit}
          </span>
          <span className={`text-xs ${confidence.color}`}>{confidence.label}</span>
        </div>
        {n.labValue != null && (
          <div className="text-xs text-blue-500 mt-0.5">
            Lab: {n.labValue} ({n.labDate})
          </div>
        )}
      </div>
    </div>
  );
}

export default function NutrientsPage() {
  const [period, setPeriod] = useState<"1d" | "7d" | "28d" | "90d">("7d");

  const { data, isLoading } = useGetNutrientAnalysis(
    { period },
    { query: { queryKey: getGetNutrientAnalysisQueryKey({ period }) } }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const nutrients = data?.nutrients ?? [];

  const statusCounts = {
    normal: nutrients.filter((n) => n.status === "normal").length,
    issues: nutrients.filter((n) => n.status.includes("deficient") || n.status.includes("excess")).length,
    noData: nutrients.filter((n) => n.status === "insufficient_data").length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutrient Analysis</h1>
          <p className="text-muted-foreground text-sm">
            Average intake vs. RDA targets ·{" "}
            <span className="text-emerald-500">{statusCounts.normal} normal</span>
            {" · "}
            <span className="text-amber-500">{statusCounts.issues} flagged</span>
            {" · "}
            <span className="text-muted-foreground">{statusCounts.noData} no data</span>
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
          <TabsList>
            <TabsTrigger value="1d">Today</TabsTrigger>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="28d">28 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {data && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
          Data quality: <strong>{data.dataQuality}</strong> · {data.daysWithData} of {data.totalDays} days logged
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(GROUPS).map(([groupName, keys]) => {
          const groupNutrients = keys
            .map((k) => nutrients.find((n) => n.nutrient === k))
            .filter(Boolean) as NutrientStatus[];
          if (!groupNutrients.length) return null;
          return (
            <Card key={groupName}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{groupName}</CardTitle>
              </CardHeader>
              <CardContent>
                {groupNutrients.map((n) => <NutrientCard key={n.nutrient} n={n} />)}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
