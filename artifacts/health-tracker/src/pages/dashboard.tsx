import { useGetDashboard } from "@workspace/api-client-react";
import { Link } from "wouter";
import { AlertCircle, ArrowRight, Droplet, CheckCircle2, TrendingUp, Moon, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Dashboard() {
  const { data: dashboard, isLoading, error } = useGetDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-[200px]" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load dashboard data.</AlertDescription>
      </Alert>
    );
  }

  if (!dashboard) return null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
          <p className="text-muted-foreground">Daily biometric summary and actionable insights.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/log">
            <Button>
              Log Today <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {!dashboard.profileSetup && (
        <Alert className="border-primary/50 bg-primary/10">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle className="text-primary">Profile Incomplete</AlertTitle>
          <AlertDescription className="mt-2 flex items-center justify-between">
            <span className="text-primary/80">Set up your biometric profile to enable precision analysis.</span>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                Complete Setup
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Log Streak</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.streak?.logStreak || 0} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Consistency is key to accurate data.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Water</CardTitle>
            <Droplet className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.today?.waterMl || 0} mL</div>
            <Progress 
              value={dashboard.waterTarget ? ((dashboard.today?.waterMl || 0) / dashboard.waterTarget) * 100 : 0} 
              className="mt-3 h-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sleep</CardTitle>
            <Moon className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.today?.sleep?.durationHours || 0} hr</div>
            <Progress 
              value={dashboard.sleepTarget ? ((dashboard.today?.sleep?.durationHours || 0) / dashboard.sleepTarget) * 100 : 0} 
              className="mt-3 h-2" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calories</CardTitle>
            <Activity className="h-4 w-4 text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.today?.totalNutrients?.calories || 0} kcal</div>
            <Progress 
              value={dashboard.calorieTarget ? ((dashboard.today?.totalNutrients?.calories || 0) / dashboard.calorieTarget) * 100 : 0} 
              className="mt-3 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Strengths</CardTitle>
            <CardDescription>Areas where you are excelling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.todayTopStrengths?.length > 0 ? (
              dashboard.todayTopStrengths.map((str, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-sm">{str}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No prominent strengths identified yet.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Risks</CardTitle>
            <CardDescription>Areas requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dashboard.todayTopRisks?.length > 0 ? (
              dashboard.todayTopRisks.map((risk, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                  <span className="text-sm">{risk}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No significant risks identified.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {dashboard.recentLabAlerts?.length > 0 && (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Lab Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentLabAlerts.map(lab => (
                <div key={lab.id} className="flex items-center justify-between rounded-md bg-background/50 p-3 border border-destructive/10">
                  <div>
                    <div className="font-medium capitalize">{lab.marker.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-muted-foreground">{new Date(lab.date).toLocaleDateString()}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-mono text-sm">
                      {lab.value} <span className="text-muted-foreground">{lab.unit}</span>
                    </div>
                    <Badge variant="destructive" className="capitalize">
                      {lab.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
