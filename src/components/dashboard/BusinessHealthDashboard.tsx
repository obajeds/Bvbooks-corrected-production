import { TrendingUp, TrendingDown, Minus, AlertTriangle, Package, Users, ShieldAlert, Zap, ArrowRight, Lock, PackageOpen, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useBusinessHealth } from "@/hooks/useBusinessHealth";
import type { BusinessHealthLevel } from "@/hooks/useBusinessHealth";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { StaffRiskScoring } from "./StaffRiskScoring";
import { BranchPerformanceTrends } from "./BranchPerformanceTrends";
import { AfterHoursAlerts } from "./AfterHoursAlerts";
import { RecentSales } from "./RecentSales";
import { useBusinessPlan } from "@/hooks/useFeatureGating";
import { useCurrency } from "@/hooks/useCurrency";
import { useCurrentUserPermissions } from "@/hooks/usePermissions";
import type { PermissionKey } from "@/lib/permissions";
import { useBranchContext } from "@/contexts/BranchContext";
import { TodaysProfitCard } from "./TodaysProfitCard";

// ── Health Display Config ────────────────────────────────────────────
const HEALTH_CONFIG: Record<BusinessHealthLevel, {
  label: string;
  color: string;
  badgeBg: string;
  icon: typeof Zap;
  iconColor: string;
}> = {
  HEALTHY: {
    label: 'Healthy',
    color: 'bg-success/20',
    badgeBg: 'bg-success/20 text-success',
    icon: Zap,
    iconColor: 'text-success',
  },
  AT_RISK: {
    label: 'Needs Attention',
    color: 'bg-warning/20',
    badgeBg: 'bg-warning/20 text-warning',
    icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  DORMANT: {
    label: 'Dormant',
    color: 'bg-warning/20',
    badgeBg: 'bg-warning/20 text-warning',
    icon: AlertTriangle,
    iconColor: 'text-warning',
  },
  NOT_INITIALIZED: {
    label: 'Stock Not Initialized',
    color: 'bg-muted',
    badgeBg: 'bg-muted text-muted-foreground',
    icon: PackageOpen,
    iconColor: 'text-muted-foreground',
  },
  SETUP_INCOMPLETE: {
    label: 'Setup Incomplete',
    color: 'bg-muted',
    badgeBg: 'bg-muted text-muted-foreground',
    icon: AlertCircle,
    iconColor: 'text-muted-foreground',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'bg-danger/20',
    badgeBg: 'bg-danger/20 text-danger',
    icon: ShieldAlert,
    iconColor: 'text-danger',
  },
};

function getHealthSubtitle(health: ReturnType<typeof useBusinessHealth>['data']): string {
  if (!health) return '';
  const { businessHealth, totalProducts, stockAtRisk, inventoryStatus, salesStatus, subscriptionActive } = health;

  if (!subscriptionActive) return 'Subscription expired. Renew to restore access.';
  if (inventoryStatus === 'SETUP_INCOMPLETE') return 'No products added yet. Add products to begin tracking.';
  if (inventoryStatus === 'NOT_INITIALIZED') return 'Products exist but no opening stock recorded.';
  if (inventoryStatus === 'CRITICAL') return `${health.negativeStock} product${health.negativeStock > 1 ? 's have' : ' has'} negative stock.`;
  if (businessHealth === 'AT_RISK') return `${stockAtRisk} of ${totalProducts} items at risk`;
  if (businessHealth === 'DORMANT') return 'No sales activity in the last 7 days.';
  return `Inventory Status: Healthy (${totalProducts} product${totalProducts !== 1 ? 's' : ''} monitored)`;
}

export function BusinessHealthDashboard() {
  const { data: health, isLoading } = useBusinessHealth();
  const { data: planInfo } = useBusinessPlan();
  const { formatCurrency } = useCurrency();
  const { data: permissionsData } = useCurrentUserPermissions();
  const { isOwner: branchIsOwner } = useBranchContext();

  const isEnterpriseFeatureEnabled = planInfo?.currentPlan === 'enterprise';

  const hasPermission = (permission: PermissionKey) => {
    if (permissionsData?.isOwner) return true;
    return permissionsData?.permissions?.includes(permission) ?? false;
  };

  const canViewProfit = branchIsOwner;
  const canViewAlerts = hasPermission('dashboard.alerts.view');
  const canViewTeamActivity = hasPermission('dashboard.team_activity.view');
  const canViewTopSelling = hasPermission('dashboard.top_selling.view');
  const canViewStaffRisk = hasPermission('dashboard.staff_risk.view');
  const canViewBranchPerformance = hasPermission('dashboard.branch_performance.view');
  const canViewAfterHours = hasPermission('dashboard.after_hours.view');

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-muted rounded-lg" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!health) return null;

  const config = HEALTH_CONFIG[health.businessHealth];
  const HealthIcon = config.icon;

  const trendIcon = health.profitTrend === 'up'
    ? <TrendingUp className="h-5 w-5 text-success" />
    : health.profitTrend === 'down'
      ? <TrendingDown className="h-5 w-5 text-danger" />
      : <Minus className="h-5 w-5 text-muted-foreground" />;

  return (
    <div className="space-y-6">
      {/* ── Business Health Status ─────────────────────────────────── */}
      <Card className="bg-primary border-0 shadow-lg">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-foreground/80 mb-1">Business Health</p>
              <p className="text-2xl font-bold text-primary-foreground">{config.label}</p>
              <p className="text-xs text-primary-foreground/70 mt-1">
                {getHealthSubtitle(health)}
              </p>
            </div>
            <div className={cn("h-16 w-16 rounded-full flex items-center justify-center", config.color)}>
              <HealthIcon className={cn("h-8 w-8", config.iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Stock at Risk (only meaningful when products exist) ──── */}
      {health.totalProducts > 0 && (
        <Card className="border shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stock at Risk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{health.stockAtRisk}</span>
              <span className="text-sm text-muted-foreground">of {health.totalProducts} items</span>
            </div>
            <Progress
              value={health.totalProducts > 0 ? (health.stockAtRisk / health.totalProducts) * 100 : 0}
              className="mt-2 h-2"
            />
            {health.negativeStock > 0 && (
              <p className="text-xs text-danger mt-1 font-medium">
                ⚠ {health.negativeStock} item{health.negativeStock > 1 ? 's' : ''} with negative stock
              </p>
            )}
            <Link to="/inventory/stock" className="text-xs text-primary hover:underline mt-2 inline-block">
              View stock control →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* ── Setup Incomplete CTA ──────────────────────────────────── */}
      {health.inventoryStatus === 'SETUP_INCOMPLETE' && (
        <Card className="border shadow-sm bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <PackageOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Inventory not initialized</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add your products to activate inventory tracking and health monitoring.
              </p>
              <Button asChild variant="default" size="sm">
                <Link to="/inventory/items">Add Products</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Not Initialized CTA ───────────────────────────────────── */}
      {health.inventoryStatus === 'NOT_INITIALIZED' && (
        <Card className="border shadow-sm bg-muted/30">
          <CardContent className="pt-6">
            <div className="text-center py-4">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">Opening stock not recorded</p>
              <p className="text-xs text-muted-foreground mb-3">
                {health.totalProducts} product{health.totalProducts !== 1 ? 's' : ''} added. Record opening stock to begin monitoring.
              </p>
              <Button asChild variant="default" size="sm">
                <Link to="/inventory/stock">Record Opening Stock</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Alerts & Items Running Low ────────────────────────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {canViewAlerts && (
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alerts & Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              {health.alerts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  {health.inventoryStatus === 'HEALTHY' ? (
                    <>
                      <Zap className="h-8 w-8 mx-auto mb-2 text-success" />
                      <p className="text-sm">No alerts. {health.totalProducts} product{health.totalProducts !== 1 ? 's' : ''} monitored.</p>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm">Complete setup to activate monitoring</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {health.alerts.map((alert, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border",
                        alert.type === 'critical' && "status-critical",
                        alert.type === 'warning' && "status-warning",
                        alert.type === 'info' && "bg-info/10 text-info border-info/20"
                      )}
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Items Running Low - only show when inventory is tracked */}
        {health.totalProducts > 0 && health.hasStockIn && (
          <Card className="border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Items Running Low</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/inventory/stock">
                  View all <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {health.lowStockItems.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">No items below reorder threshold</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {health.lowStockItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[180px]">{item.name}</span>
                      <Badge
                        variant={item.quantity === 0 ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {item.quantity === 0 ? 'Out of stock' : `${item.quantity} left`}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Recent Sales ──────────────────────────────────────────── */}
      <RecentSales />

      {/* ── Today's Profit (owner) / Today's Sales (staff) ─────── */}
      {canViewProfit ? (
        <TodaysProfitCard mode="profit" value={health.profitToday} trend={health.profitTrend} />
      ) : (
        <TodaysProfitCard mode="sales" value={health.salesToday} trend={health.profitTrend} />
      )}

      {/* ── Key Metrics Grid ──────────────────────────────────────── */}
      {(canViewTeamActivity || canViewTopSelling) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {canViewTeamActivity && (
            <Card className="border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Team Activity</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">{health.staffActivitySummary.activeToday}</span>
                  <span className="text-sm text-muted-foreground">staff members</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  assigned to this branch
                </p>
                <Link to="/staff" className="text-xs text-primary hover:underline mt-2 inline-block">
                  View team activity →
                </Link>
              </CardContent>
            </Card>
          )}

          {canViewTopSelling && (
            <Card className={cn(
              "border shadow-sm hover:shadow-md transition-shadow",
              canViewTeamActivity ? "md:col-span-1 lg:col-span-2" : "md:col-span-2 lg:col-span-3"
            )}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Selling This Month</CardTitle>
                <TrendingUp className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                {health.topSellingItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales data yet</p>
                ) : (
                  <div className="space-y-2">
                    {health.topSellingItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-4">{index + 1}.</span>
                          <span className="text-sm font-medium truncate max-w-[150px]">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold">{formatCurrency(item.revenue)}</span>
                          <span className="text-xs text-muted-foreground ml-2">({item.quantity} sold)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Enterprise Features ───────────────────────────────────── */}
      {isEnterpriseFeatureEnabled && (canViewStaffRisk || canViewBranchPerformance || canViewAfterHours) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {canViewStaffRisk && <StaffRiskScoring />}
          {canViewBranchPerformance && <BranchPerformanceTrends />}
          {canViewAfterHours && <AfterHoursAlerts />}
        </div>
      )}

      {!isEnterpriseFeatureEnabled && (
        <Card className="border shadow-sm bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Enterprise Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-6">
              <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Staff Risk Scoring, Branch Performance Trends, and After Hours Alerts are available on the Enterprise plan.
              </p>
              <Button asChild variant="default" size="sm">
                <Link to="/subscription">Upgrade to Enterprise</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
