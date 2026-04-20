import { ReactNode } from "react";
import { useSubscriptionStatus, type SubscriptionAction, BLOCKED_ACTIONS_ON_EXPIRY } from "@/hooks/useSubscriptionStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface SubscriptionAccessGuardProps {
  businessId?: string;
  action: SubscriptionAction;
  /** Optional custom handler - if not provided, uses centralized navigation */
  onRenew?: () => void;
  children: ReactNode;
  fallback?: ReactNode;
}

// Read-only actions that remain accessible even when expired
const READONLY_ACTIONS: SubscriptionAction[] = [
  "view_reports",
  "view_dashboard",
  "view_billing",
];

function getActionLabel(action: SubscriptionAction): string {
  const labels: Record<SubscriptionAction, string> = {
    create_sale: "Create Sales",
    add_expense: "Record Expenses",
    add_customer: "Add Customers",
    add_stock: "Manage Stock",
    adjust_stock: "Adjust Stock",
    view_reports: "View Reports",
    export_reports: "Export Reports",
    manage_staff: "Manage Staff",
    manage_branches: "Manage Branches",
    apply_discount: "Apply Discounts",
    create_invoice: "Create Invoices",
    view_dashboard: "View Dashboard",
    view_billing: "View Billing",
  };
  return labels[action] || action;
}

/**
 * SubscriptionAccessGuard - STRICT enforcement of subscription status.
 * NO GRACE PERIOD. Only ACTIVE subscription grants access to paid features.
 * Now uses centralized subscription navigation by default.
 * 
 * Usage:
 * <SubscriptionAccessGuard action="create_sale">
 *   <POSComponent />
 * </SubscriptionAccessGuard>
 */
export function SubscriptionAccessGuard({
  action,
  onRenew,
  children,
  fallback,
}: SubscriptionAccessGuardProps) {
  const { status, tier, isStrictlyActive, message, refresh, isLoading } = useSubscriptionStatus();
  const { navigateToRenew, isNavigating } = useSubscriptionNavigation();

  const handleRenew = () => {
    if (onRenew) {
      onRenew();
    } else {
      navigateToRenew();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Free tier: only allow read-only actions and basic operations
  if (tier === "free") {
    const FREE_TIER_ALLOWED: SubscriptionAction[] = [
      "create_sale",
      "add_customer",
      "view_reports",
      "view_dashboard",
      "view_billing",
    ];
    if (!FREE_TIER_ALLOWED.includes(action)) {
      if (fallback) return <>{fallback}</>;
      return (
        <Card className="border-primary/30 bg-primary/5 max-w-lg mx-auto">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-lg">Upgrade Required</CardTitle>
            <CardDescription>
              {getActionLabel(action)} is not available on the Free plan.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleRenew} disabled={isNavigating}>
              {isNavigating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      );
    }
    return <>{children}</>;
  }

  // Read-only actions are always allowed
  const isReadOnly = READONLY_ACTIONS.includes(action);
  if (isReadOnly) {
    return <>{children}</>;
  }

  // Check if this action requires active subscription
  const requiresActive = BLOCKED_ACTIONS_ON_EXPIRY.includes(action);

  // If action doesn't require active subscription, allow
  if (!requiresActive) {
    return <>{children}</>;
  }

  // STRICT CHECK: Subscription must be strictly active
  if (!isStrictlyActive) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <Card className="border-destructive/50 bg-destructive/5 max-w-lg mx-auto">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-lg flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Subscription {status === "expired" ? "Expired" : "Inactive"}
          </CardTitle>
          <CardDescription>
            {message || `Your subscription is not active. Renew to continue using ${getActionLabel(action)}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Your data is safe. Renew your subscription to regain full access.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={handleRenew} disabled={isNavigating}>
              {isNavigating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Renew Subscription
            </Button>
            <Button variant="outline" onClick={refresh} disabled={isNavigating}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
