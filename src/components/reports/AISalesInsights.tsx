import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Users, 
  Sparkles, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Lightbulb,
  BarChart3,
  Package,
  ArrowRight,
  Crown,
  Lock
} from "lucide-react";
import { useAIInsights, useHasAIInsightsAddon, AIInsightsData } from "@/hooks/useAIInsights";
import { useCurrency } from "@/hooks/useCurrency";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { format } from "date-fns";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";
import { useBranchContext } from "@/contexts/BranchContext";

export function AISalesInsights() {
  const [period, setPeriod] = useState("month");
  const { data: insights, isGenerating, generateInsights } = useAIInsights(period);
  const { data: hasAddon, isLoading: checkingAddon } = useHasAIInsightsAddon();
  const { data: planInfo, isLoading: checkingPlan } = useBusinessPlan();
  const { formatCurrency } = useCurrency();
  const { navigateToUpgrade, isNavigating } = useSubscriptionNavigation();
  const { isOwner, isLoading: branchLoading } = useBranchContext();

  // Check if user is on Professional or Enterprise plan
  const effectivePlan = planInfo?.effectivePlan;
  const isEligiblePlan = effectivePlan === 'professional' || effectivePlan === 'enterprise';

  if (checkingAddon || checkingPlan || branchLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Owner-only gate — staff cannot access AI Insights
  if (!isOwner) {
    return (
      <Card className="border-muted bg-muted/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            AI Sales & Loss Insights
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            This feature is restricted to the business owner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Only the business owner can access AI-powered sales and loss insights. Contact your business owner for more information.
          </p>
        </CardContent>
      </Card>
    );
  }

  // First check: User must be on Professional or Enterprise plan
  if (!isEligiblePlan) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-muted-foreground" />
            AI Sales & Loss Insights
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardTitle>
          <CardDescription>
            AI-powered analysis of sales patterns, loss prevention, and staff performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Sales Patterns</p>
                <p className="text-xs text-muted-foreground">Peak hours, trending products, seasonal trends</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Loss Prevention</p>
                <p className="text-xs text-muted-foreground">Unusual discounts, void patterns, stock issues</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-sm text-muted-foreground">Staff Performance</p>
                <p className="text-xs text-muted-foreground">Top performers, anomaly detection per staff</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Crown className="h-3 w-3" />
              Upgrade to Professional or Enterprise to unlock this add-on
            </p>
            <Button onClick={() => navigateToUpgrade()} className="w-fit" disabled={isNavigating}>
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Plan
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Second check: User must have purchased the AI Insights add-on
  if (!hasAddon) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Sales & Loss Insights
            <Badge variant="secondary" className="ml-2">
              <Sparkles className="h-3 w-3 mr-1" />
              Add-on
            </Badge>
          </CardTitle>
          <CardDescription>
            AI-powered analysis of sales patterns, loss prevention, and staff performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Sales Patterns</p>
                <p className="text-xs text-muted-foreground">Peak hours, trending products, seasonal trends</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Loss Prevention</p>
                <p className="text-xs text-muted-foreground">Unusual discounts, void patterns, stock issues</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Staff Performance</p>
                <p className="text-xs text-muted-foreground">Top performers, anomaly detection per staff</p>
              </div>
            </div>
          </div>
          <Button onClick={() => navigateToUpgrade()} className="w-full" disabled={isNavigating}>
            <Sparkles className="h-4 w-4 mr-2" />
            Purchase AI Insights Add-on
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Sales & Loss Insights
              <Badge variant="outline" className="border-primary/50 text-primary">
                <Sparkles className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </CardTitle>
            <CardDescription>
              AI-powered analysis of your business performance
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">Quarter</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => generateInsights.mutate(period)}
              disabled={isGenerating}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isGenerating ? (
          <InsightsLoading />
        ) : insights ? (
          <InsightsDisplay insights={insights} formatCurrency={formatCurrency} />
        ) : (
          <EmptyState onGenerate={() => generateInsights.mutate(period)} />
        )}
      </CardContent>
    </Card>
  );
}

function InsightsLoading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
        <Brain className="h-6 w-6 text-primary animate-pulse" />
        <div className="flex-1">
          <p className="font-medium">Analyzing your business data...</p>
          <p className="text-sm text-muted-foreground">This may take a few seconds</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

function EmptyState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="text-center py-8">
      <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
      <h3 className="font-medium mb-2">No insights generated yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Click the button below to analyze your business data and get AI-powered insights
      </p>
      <Button onClick={onGenerate}>
        <Sparkles className="h-4 w-4 mr-2" />
        Generate Insights
      </Button>
    </div>
  );
}

function InsightsDisplay({ 
  insights, 
  formatCurrency 
}: { 
  insights: AIInsightsData;
  formatCurrency: (amount: number) => string;
}) {
  const { overallHealth, salesPatterns, lossPreventionAlerts, staffPerformance } = insights.insights;

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-background flex items-center justify-center border-4 border-primary">
            <span className="text-2xl font-bold">{overallHealth.score}</span>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold">Business Health Score</h3>
            <Badge variant={overallHealth.score >= 70 ? "default" : overallHealth.score >= 50 ? "secondary" : "destructive"}>
              {overallHealth.score >= 70 ? "Good" : overallHealth.score >= 50 ? "Fair" : "Needs Attention"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{overallHealth.summary}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Generated {format(new Date(insights.generatedAt), "PPp")}
          </p>
        </div>
      </div>

      {/* Critical Alerts */}
      {overallHealth.criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Alerts</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {overallHealth.criticalAlerts.map((alert, i) => (
                <li key={i}>{alert}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Summary */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <SummaryCard 
          icon={BarChart3} 
          label="Sales" 
          value={insights.dataSummary.salesCount.toString()} 
        />
        <SummaryCard 
          icon={TrendingUp} 
          label="Revenue" 
          value={formatCurrency(insights.dataSummary.totalRevenue)} 
        />
        <SummaryCard 
          icon={TrendingUp} 
          label="Avg Order" 
          value={formatCurrency(insights.dataSummary.avgOrderValue)} 
        />
        <SummaryCard 
          icon={Package} 
          label="Stock Moves" 
          value={insights.dataSummary.stockMovements.toString()} 
        />
        <SummaryCard 
          icon={Users} 
          label="Staff" 
          value={insights.dataSummary.staffCount.toString()} 
        />
      </div>

      {/* Detailed Insights Tabs */}
      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sales" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Sales</span>
          </TabsTrigger>
          <TabsTrigger value="loss" className="flex items-center gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Loss Prevention</span>
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Staff</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <InsightSection
            title="Peak Hours"
            icon={Clock}
            items={salesPatterns.peakHours}
            emptyMessage="No peak hour patterns detected"
          />
          <InsightSection
            title="Peak Days"
            icon={BarChart3}
            items={salesPatterns.peakDays}
            emptyMessage="No peak day patterns detected"
          />
          <InsightSection
            title="Trending Products"
            icon={Package}
            items={salesPatterns.trendingProducts}
            emptyMessage="No trending products detected"
          />
          {salesPatterns.seasonalInsights && (
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                Seasonal Insights
              </h4>
              <p className="text-sm text-muted-foreground">{salesPatterns.seasonalInsights}</p>
            </div>
          )}
          <RecommendationsSection recommendations={salesPatterns.recommendations} />
        </TabsContent>

        <TabsContent value="loss" className="mt-4 space-y-4">
          <InsightSection
            title="High Risk Areas"
            icon={AlertTriangle}
            items={lossPreventionAlerts.highRiskAreas}
            emptyMessage="No high risk areas detected"
            variant="warning"
          />
          <InsightSection
            title="Inventory Anomalies"
            icon={Package}
            items={lossPreventionAlerts.inventoryAnomalies}
            emptyMessage="No inventory anomalies detected"
            variant="warning"
          />
          {lossPreventionAlerts.unusualDiscounts && (
            <div className="p-3 rounded-lg bg-muted/50">
              <h4 className="font-medium text-sm mb-1 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Discount Analysis
              </h4>
              <p className="text-sm text-muted-foreground">{lossPreventionAlerts.unusualDiscounts}</p>
            </div>
          )}
          <RecommendationsSection recommendations={lossPreventionAlerts.recommendations} />
        </TabsContent>

        <TabsContent value="staff" className="mt-4 space-y-4">
          <InsightSection
            title="Top Performers"
            icon={CheckCircle2}
            items={staffPerformance.topPerformers}
            emptyMessage="No top performers identified"
            variant="success"
          />
          <InsightSection
            title="Needs Improvement"
            icon={Users}
            items={staffPerformance.needsImprovement}
            emptyMessage="No improvement areas identified"
          />
          <InsightSection
            title="Anomalies"
            icon={AlertTriangle}
            items={staffPerformance.anomalies}
            emptyMessage="No anomalies detected"
            variant="warning"
          />
          <RecommendationsSection recommendations={staffPerformance.recommendations} />
        </TabsContent>
      </Tabs>

      {/* Opportunities */}
      {overallHealth.opportunities.length > 0 && (
        <div className="p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20">
          <h4 className="font-medium flex items-center gap-2 mb-2">
            <Lightbulb className="h-4 w-4 text-green-600" />
            Growth Opportunities
          </h4>
          <ul className="space-y-1">
            {overallHealth.opportunities.map((opp, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                {opp}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: React.ElementType; 
  label: string; 
  value: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-muted/50 text-center">
      <Icon className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
      <p className="text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function InsightSection({ 
  title, 
  icon: Icon, 
  items, 
  emptyMessage,
  variant = "default"
}: { 
  title: string; 
  icon: React.ElementType; 
  items: (string | Record<string, unknown>)[];
  emptyMessage: string;
  variant?: "default" | "warning" | "success";
}) {
  const iconColor = variant === "warning" ? "text-amber-500" : variant === "success" ? "text-green-500" : "text-primary";
  
  // Helper to safely convert items to displayable strings
  const formatItem = (item: string | Record<string, unknown>): string => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      // Handle common object structures like {hour, explanation}, {day, explanation}, etc.
      const values = Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number');
      return values.join(' - ');
    }
    return String(item);
  };
  
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        {title}
      </h4>
      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-muted-foreground">•</span>
              {formatItem(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground italic">{emptyMessage}</p>
      )}
    </div>
  );
}

function RecommendationsSection({ recommendations }: { recommendations: string[] }) {
  if (recommendations.length === 0) return null;
  
  return (
    <div className="p-4 rounded-lg bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
      <h4 className="font-medium flex items-center gap-2 mb-2">
        <Lightbulb className="h-4 w-4 text-primary" />
        Recommendations
      </h4>
      <ul className="space-y-2">
        {recommendations.map((rec, i) => (
          <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
            <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            {rec}
          </li>
        ))}
      </ul>
    </div>
  );
}
