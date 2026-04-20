import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, ShieldAlert, ShieldCheck, User, TrendingDown, AlertCircle } from "lucide-react";
import { useStaffRiskScoring, StaffRiskScore } from "@/hooks/useStaffRiskScoring";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/hooks/useBusiness";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function RiskBadge({ level }: { level: StaffRiskScore["riskLevel"] }) {
  const variants = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-warning/10 text-warning border-warning/20",
    high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    critical: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const icons = {
    low: ShieldCheck,
    medium: AlertCircle,
    high: AlertTriangle,
    critical: ShieldAlert,
  };

  const Icon = icons[level];

  return (
    <Badge variant="outline" className={cn("gap-1 capitalize", variants[level])}>
      <Icon className="h-3 w-3" />
      {level}
    </Badge>
  );
}

export function StaffRiskScoring() {
  const { data: business, isLoading: businessLoading } = useBusiness();
  const { data: riskScores, isLoading } = useStaffRiskScoring();

  // Enterprise-only feature check
  const currentPlan = business?.current_plan;
  const isEnterprise = currentPlan === 'enterprise';

  // Show loading while checking plan
  if (businessLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Staff Risk Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!isEnterprise) {
    return <UpgradePrompt featureName="Staff Risk Scoring" requiredPlan="enterprise" />;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Staff Risk Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const highRiskStaff = riskScores?.filter((s) => s.riskLevel === "high" || s.riskLevel === "critical") || [];
  const hasRiskyStaff = highRiskStaff.length > 0;

  return (
    <Card className={cn(hasRiskyStaff && "border-warning")}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={cn("h-5 w-5", hasRiskyStaff ? "text-warning" : "text-muted-foreground")} />
            Staff Risk Scoring
          </div>
          {hasRiskyStaff && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
              {highRiskStaff.length} at risk
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!riskScores || riskScores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">No staff activity data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {riskScores.slice(0, 5).map((staff) => (
              <div key={staff.staffId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[150px]">{staff.staffName}</span>
                    <RiskBadge level={staff.riskLevel} />
                  </div>
                  <span className="text-sm font-mono">{staff.riskScore}/100</span>
                </div>
                <Progress
                  value={staff.riskScore}
                  className={cn(
                    "h-2",
                    staff.riskLevel === "critical" && "[&>div]:bg-destructive",
                    staff.riskLevel === "high" && "[&>div]:bg-orange-500",
                    staff.riskLevel === "medium" && "[&>div]:bg-warning",
                    staff.riskLevel === "low" && "[&>div]:bg-success"
                  )}
                />
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{staff.metrics.salesCount} sales</span>
                  <span>•</span>
                  <span>{staff.metrics.refundCount} refunds</span>
                  <span>•</span>
                  <span>{staff.metrics.voidCount} voids</span>
                  <span>•</span>
                  <span>{staff.metrics.avgDiscountPercent}% avg discount</span>
                </div>
                {staff.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {staff.flags.map((flag, i) => (
                      <Badge key={i} variant="outline" className="text-xs bg-muted">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
