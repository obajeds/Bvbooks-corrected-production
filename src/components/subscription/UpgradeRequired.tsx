import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Sparkles, ArrowRight, Crown, Zap, Loader2 } from "lucide-react";
import { BVBooksPlan } from "@/hooks/useFeatureGating";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface UpgradeRequiredProps {
  featureKey: string;
  requiredPlan: BVBooksPlan;
  title?: string;
  description?: string;
  compact?: boolean;
}

const PLAN_DISPLAY: Record<BVBooksPlan, { name: string; icon: React.ReactNode; color: string }> = {
  free: { name: "Free", icon: <Zap className="h-5 w-5" />, color: "text-muted-foreground" },
  professional: { name: "Professional", icon: <Sparkles className="h-5 w-5" />, color: "text-blue-500" },
  enterprise: { name: "Enterprise", icon: <Crown className="h-5 w-5" />, color: "text-amber-500" },
};

const FEATURE_NAMES: Record<string, { title: string; description: string }> = {
  // Expenses
  "expenses.recording": {
    title: "Expense Tracking",
    description: "Record and categorize business expenses to track your spending.",
  },
  "expenses.categories": {
    title: "Expense Categories",
    description: "Organize expenses by categories for better financial insights.",
  },
  "expenses.limits": {
    title: "Expense Limits",
    description: "Set spending limits and get alerts when budgets are exceeded.",
  },
  // Approvals
  "approvals.stock": {
    title: "Stock Adjustment Approvals",
    description: "Require approval for stock adjustments to prevent unauthorized changes.",
  },
  "approvals.discount": {
    title: "Discount Approvals",
    description: "Control discounts with approval workflows to protect margins.",
  },
  "approvals.refund": {
    title: "Refund Approvals",
    description: "Require approval for refunds to prevent fraudulent returns.",
  },
  "approvals.expense": {
    title: "Expense Approvals",
    description: "Review and approve expenses before they're recorded.",
  },
  // Team
  "team.advanced_roles": {
    title: "Advanced Team Management",
    description: "Access advanced role permissions, attendance tracking, and payroll features.",
  },
  "team.hrm": {
    title: "HRM Features",
    description: "Access departments, attendance tracking, leave management, and payroll features.",
  },
  "team.performance": {
    title: "Staff Performance",
    description: "Track staff performance metrics and identify top performers.",
  },
  // Business Insights
  "insights.loss_risk": {
    title: "Loss Risk Indicators",
    description: "Identify potential loss risks with advanced analytics.",
  },
  "insights.staff_risk": {
    title: "Staff Risk Scoring",
    description: "Monitor staff activity patterns to detect potential issues.",
  },
  "insights.branch_trends": {
    title: "Branch Performance Trends",
    description: "Compare and analyze performance across all branches.",
  },
  // Notifications
  "notifications.after_hours": {
    title: "After-Hours Alerts",
    description: "Get notified of suspicious activity outside business hours.",
  },
  "notifications.risk_patterns": {
    title: "Risk Pattern Alerts",
    description: "Automatic alerts when unusual patterns are detected.",
  },
  // Multi-branch
  "stock.transfers": {
    title: "Stock Transfers",
    description: "Transfer inventory between branches with approval workflows.",
  },
  "pricing.branch_level": {
    title: "Branch-Level Pricing",
    description: "Set different prices for products at different branches.",
  },
  // Sales
  "sales.discounts": {
    title: "Discount Controls",
    description: "Apply discounts with percentage limits and minimum price enforcement.",
  },
  "sales.refunds": {
    title: "Refund Processing",
    description: "Process refunds with proper controls and approvals.",
  },
  // Accounting
  "accounting.profit_loss": {
    title: "Profit & Loss Reports",
    description: "Access detailed profit and loss reports for your business.",
  },
  "accounting.branch_pl": {
    title: "Branch-Level P&L",
    description: "View profit and loss reports for individual branches.",
  },
  // Activity
  "activity.full_audit": {
    title: "Full Audit Trail",
    description: "Complete immutable audit trail of all business activities.",
  },
  // Settlements & Reconciliations
  "accounting.settlements": {
    title: "Settlements",
    description: "Track and manage daily cash settlements by cashier and payment method.",
  },
  "accounting.reconciliations": {
    title: "Reconciliations",
    description: "Compare expected vs actual amounts to identify discrepancies.",
  },
  // Rewards
  "customers.rewards": {
    title: "Rewards & Loyalty",
    description: "Build customer loyalty with points-based rewards and retention tools.",
  },
  // Stock Adjustments
  "stock.adjustments": {
    title: "Stock Adjustments",
    description: "Correct inventory discrepancies when physical stock differs from system records.",
  },
  // Reports Export
  "reports.export": {
    title: "Report Exports",
    description: "Export your sales and inventory data to CSV, Excel, or PDF.",
  },
  // Default
  default: {
    title: "Premium Feature",
    description: "This feature requires a higher subscription plan.",
  },
};

export function UpgradeRequired({
  featureKey,
  requiredPlan,
  title,
  description,
  compact = false,
}: UpgradeRequiredProps) {
  const planInfo = PLAN_DISPLAY[requiredPlan];
  const featureInfo = FEATURE_NAMES[featureKey] || FEATURE_NAMES.default;
  const { navigateToUnlockFeature, isNavigating } = useSubscriptionNavigation();
  
  const displayTitle = title || featureInfo.title;
  const displayDescription = description || featureInfo.description;

  const handleUpgrade = () => {
    navigateToUnlockFeature(featureKey, requiredPlan);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <Lock className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{displayTitle}</p>
            <p className="text-xs text-muted-foreground">
              Available on {planInfo.name} plan
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleUpgrade} disabled={isNavigating}>
          {isNavigating ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : null}
          Upgrade
          <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="pb-4">
          <div className="mx-auto mb-4 p-4 rounded-full bg-gradient-to-br from-muted to-muted/50">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{displayTitle}</CardTitle>
          <CardDescription className="text-base">
            {displayDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-muted-foreground">Available on</span>
            <span className={`flex items-center gap-1 font-medium ${planInfo.color}`}>
              {planInfo.icon}
              {planInfo.name}
            </span>
            <span className="text-muted-foreground">plan</span>
          </div>
          
          <Button className="w-full" onClick={handleUpgrade} disabled={isNavigating}>
            {isNavigating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Upgrade Now
          </Button>
          
          <p className="text-xs text-muted-foreground">
            Unlock this feature and more with an upgraded plan
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Inline upgrade badge for disabled buttons/actions
 */
export function UpgradeBadge({ plan }: { plan: BVBooksPlan }) {
  const planInfo = PLAN_DISPLAY[plan];
  
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${planInfo.color}`}>
      <Lock className="h-3 w-3" />
      {planInfo.name}
    </span>
  );
}
