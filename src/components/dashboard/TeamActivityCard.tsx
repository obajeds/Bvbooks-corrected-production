import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowRight, ShieldAlert, ShieldCheck, AlertCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useStaffRiskScoring, StaffRiskScore } from "@/hooks/useStaffRiskScoring";
import { useBusinessPlan } from "@/hooks/useFeatureGating";

interface TeamActivityCardProps {
  activeStaff: number;
  totalStaff: number;
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
    <Badge variant="outline" className={cn("gap-1 capitalize text-xs", variants[level])}>
      <Icon className="h-3 w-3" />
      {level}
    </Badge>
  );
}

export function TeamActivityCard({ activeStaff, totalStaff }: TeamActivityCardProps) {
  const [isRiskOpen, setIsRiskOpen] = useState(false);
  const { data: planInfo } = useBusinessPlan();
  const { data: riskScores, isLoading: riskLoading } = useStaffRiskScoring();
  
  const isEnterprise = planInfo?.currentPlan === 'enterprise';
  const highRiskCount = riskScores?.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length || 0;
  const hasRiskData = isEnterprise && !riskLoading && riskScores && riskScores.length > 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Users className="h-5 w-5 text-muted-foreground" />
            Team Activity
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/staff">
              View activity
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Staff Summary */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{activeStaff}</span>
              <span className="text-sm text-muted-foreground">/ {totalStaff}</span>
            </div>
            <p className="text-xs text-muted-foreground">Active team members</p>
          </div>
          {highRiskCount > 0 && isEnterprise && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              {highRiskCount} at risk
            </Badge>
          )}
        </div>

        {/* Staff Risk Scoring - Collapsible (Enterprise only) */}
        {hasRiskData && (
          <Collapsible open={isRiskOpen} onOpenChange={setIsRiskOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-between p-3 h-auto hover:bg-muted/50 rounded-lg border border-dashed"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Staff Risk Scoring</span>
                  {highRiskCount > 0 && (
                    <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 text-xs">
                      {highRiskCount} flagged
                    </Badge>
                  )}
                </div>
                {isRiskOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="space-y-3 max-h-[250px] overflow-y-auto rounded-lg border p-3 bg-muted/30">
                {riskScores.slice(0, 5).map((staff) => (
                  <div key={staff.staffId} className="space-y-1.5 pb-3 border-b last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[140px]">
                        {staff.staffName}
                      </span>
                      <div className="flex items-center gap-2">
                        <RiskBadge level={staff.riskLevel} />
                        <span className="text-xs font-mono text-muted-foreground">
                          {staff.riskScore}
                        </span>
                      </div>
                    </div>
                    <Progress
                      value={staff.riskScore}
                      className={cn(
                        "h-1.5",
                        staff.riskLevel === "critical" && "[&>div]:bg-destructive",
                        staff.riskLevel === "high" && "[&>div]:bg-orange-500",
                        staff.riskLevel === "medium" && "[&>div]:bg-warning",
                        staff.riskLevel === "low" && "[&>div]:bg-success"
                      )}
                    />
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{staff.metrics.salesCount} sales</span>
                      <span>•</span>
                      <span>{staff.metrics.refundCount} refunds</span>
                      <span>•</span>
                      <span>{staff.metrics.voidCount} voids</span>
                      <span>•</span>
                      <span>{staff.metrics.avgDiscountPercent}% disc</span>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
