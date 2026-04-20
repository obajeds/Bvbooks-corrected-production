import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, Building2, Trophy, Users } from "lucide-react";
import { useBranchPerformance, useBranchTrends } from "@/hooks/useBranchPerformance";
import { cn } from "@/lib/utils";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { useBusiness } from "@/hooks/useBusiness";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useCurrency } from "@/hooks/useCurrency";

const BRANCH_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function BranchPerformanceTrends() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: performance, isLoading: perfLoading } = useBranchPerformance();
  const { data: trends, isLoading: trendsLoading } = useBranchTrends();
  const { formatCurrency, formatCompact } = useCurrency();

  // Enterprise-only feature check
  const currentPlan = business?.current_plan;
  const isEnterprise = currentPlan === 'enterprise';

  // Show loading while checking plan
  if (businessLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!isEnterprise) {
    return <UpgradePrompt featureName="Branch Performance Trends" requiredPlan="enterprise" />;
  }

  const isLoading = perfLoading || trendsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!performance || performance.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No branch data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Transform trends data for chart
  const chartData: Record<string, any>[] = [];
  const branchNames = new Set<string>();
  
  (trends || []).forEach((t) => {
    branchNames.add(t.branchName);
    let dayData = chartData.find((d) => d.date === t.date);
    if (!dayData) {
      dayData = { date: t.date };
      chartData.push(dayData);
    }
    dayData[t.branchName] = t.revenue;
  });

  chartData.sort((a, b) => a.date.localeCompare(b.date));

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="h-4 w-4 text-success" />;
    if (trend === "down") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Branch Performance Trends
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trend Chart */}
        {chartData.length > 0 && (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), "EEE")}
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  tickFormatter={(v) => formatCompact(v)}
                  tick={{ fontSize: 12 }}
                  width={60}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                />
                <Legend />
                {Array.from(branchNames).map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={BRANCH_COLORS[i % BRANCH_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Branch Rankings */}
        <div className="space-y-3">
          {performance.map((branch, index) => (
            <div
              key={branch.branchId}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                index === 0 && "bg-primary/5 border-primary/20"
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                    index === 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index === 0 ? <Trophy className="h-4 w-4" /> : branch.ranking}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{branch.branchName}</span>
                    {branch.isMain && (
                      <Badge variant="secondary" className="text-xs">
                        Main
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{branch.metrics.salesCount} sales</span>
                    <span>•</span>
                    <Users className="h-3 w-3" />
                    <span>{branch.metrics.staffCount}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(branch.metrics.totalRevenue)}</div>
                <div className="flex items-center gap-1 text-xs">
                  <TrendIcon trend={branch.trend} />
                  <span
                    className={cn(
                      branch.metrics.salesGrowth > 0
                        ? "text-success"
                        : branch.metrics.salesGrowth < 0
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {branch.metrics.salesGrowth > 0 ? "+" : ""}
                    {branch.metrics.salesGrowth}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
