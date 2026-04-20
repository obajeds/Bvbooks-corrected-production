import { ReactNode, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useHasExpiredAddons, useAddonExpiry } from "@/hooks/useAddonExpiry";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Lock, Sparkles, RefreshCw, Loader2, Package } from "lucide-react";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";
import { format } from "date-fns";

// Routes that are always accessible regardless of subscription status
const ALWAYS_ACCESSIBLE_ROUTES = [
  "/dashboard",
  "/dashboard/subscription",
  "/dashboard/settings",
  "/dashboard/notifications",
  "/dashboard/help",
  "/dashboard/activity",
];

// Read-only routes that allow viewing historical data
const READ_ONLY_ROUTES = [
  "/dashboard/reports",
  "/dashboard/sales",
];

interface GlobalSubscriptionEnforcementProps {
  children: ReactNode;
}

/**
 * GlobalSubscriptionEnforcement - Enforces subscription and addon expiry at layout level.
 * 
 * This component:
 * 1. Checks main subscription expiry on every page load/navigation
 * 2. Checks addon expiry for addon-gated features
 * 3. Shows blocking overlay for expired subscriptions
 * 4. Allows read-only access to historical data when appropriate
 * 5. Forces user to interact with Renew/Upgrade CTA
 */
export function GlobalSubscriptionEnforcement({ children }: GlobalSubscriptionEnforcementProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { 
    status, 
    tier, 
    isStrictlyActive, 
    hasAccess,
    message, 
    refresh, 
    isLoading: subscriptionLoading,
    expiryDate,
    hadPaidPlan,
  } = useSubscriptionStatus();
  const { navigateToRenew, isNavigating } = useSubscriptionNavigation();
  const { hasExpired: hasExpiredAddons, count: expiredAddonCount } = useHasExpiredAddons();
  const { expiredAddons, expiringAddons } = useAddonExpiry();
  const hasLoadedOnce = useRef(false);

  // Track when subscription data has loaded at least once
  if (!subscriptionLoading) {
    hasLoadedOnce.current = true;
  }

  const currentPath = location.pathname;

  // Check if current route is always accessible
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE_ROUTES.some(route => 
    currentPath === route || currentPath.startsWith(route + "/")
  );

  // Check if current route is read-only (historical data viewing)
  const isReadOnlyRoute = READ_ONLY_ROUTES.some(route => 
    currentPath === route || currentPath.startsWith(route + "/")
  );

  // CRITICAL: Use hasAccess from useSubscriptionStatus which correctly handles:
  // - Expired paid plans (even if tier shows as "free")
  // - True free tier users (never had paid plan)
  // - Active paid subscriptions
  // The status hook already determines access based on expiry date presence
  const isSubscriptionBlocked = !hasAccess && !isAlwaysAccessible;

  // Log enforcement for debugging
  useEffect(() => {
    if (!subscriptionLoading) {
      console.log("[GlobalEnforcement] Route:", currentPath, {
        tier,
        status,
        isStrictlyActive,
        hasAccess,
        hadPaidPlan,
        expiryDate: expiryDate?.toISOString(),
        isAlwaysAccessible,
        isReadOnlyRoute,
        isSubscriptionBlocked,
        hasExpiredAddons,
      });
    }
  }, [currentPath, tier, status, isStrictlyActive, hasAccess, hadPaidPlan, expiryDate, subscriptionLoading, isAlwaysAccessible, isReadOnlyRoute, isSubscriptionBlocked, hasExpiredAddons]);

  // Loading state
  if (subscriptionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Subscription expired - show full blocking overlay
  // CRITICAL: Never show blocked state until subscription has loaded at least once
  if (isSubscriptionBlocked && hasLoadedOnce.current) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-muted/30">
        <SubscriptionBlockedCard
          status={status}
          message={message}
          onRenew={navigateToRenew}
          onRefresh={refresh}
          isNavigating={isNavigating}
          hasExpiredAddons={hasExpiredAddons}
          expiredAddonCount={expiredAddonCount}
          expiryDate={expiryDate}
        />
      </div>
    );
  }

  // Show addon expiry warnings (non-blocking but prominent)
  if (hasExpiredAddons && !isAlwaysAccessible) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <AddonExpiryBanner 
          expiredAddons={expiredAddons} 
          onNavigateToSubscription={() => navigate("/dashboard/subscription")}
        />
        {children}
      </div>
    );
  }

  // Show expiring soon warning
  if (expiringAddons.length > 0 && !isAlwaysAccessible) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <AddonExpiringSoonBanner 
          expiringAddons={expiringAddons}
          onNavigateToSubscription={() => navigate("/dashboard/subscription")}
        />
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// --- Sub-components ---

interface SubscriptionBlockedCardProps {
  status: string;
  message: string | null;
  onRenew: () => void;
  onRefresh: () => void;
  isNavigating: boolean;
  hasExpiredAddons: boolean;
  expiredAddonCount: number;
  expiryDate: Date | null;
}

function SubscriptionBlockedCard({
  status,
  message,
  onRenew,
  onRefresh,
  isNavigating,
  hasExpiredAddons,
  expiredAddonCount,
  expiryDate,
}: SubscriptionBlockedCardProps) {
  const formattedExpiryDate = expiryDate ? format(expiryDate, "MMMM d, yyyy") : null;
  
  return (
    <Card className="border-destructive/50 bg-destructive/5 max-w-lg w-full shadow-2xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl flex items-center justify-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          {status === "expired" ? "Subscription Expired" : "Subscription Inactive"}
        </CardTitle>
        <CardDescription className="text-base mt-2">
          {message || "Your subscription is no longer active. Renew now to continue using premium features."}
        </CardDescription>
        {formattedExpiryDate && (
          <Badge variant="destructive" className="mx-auto mt-3">
            Expired on {formattedExpiryDate}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {hasExpiredAddons && (
          <div className="flex items-center justify-center gap-2 text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
            <Package className="h-4 w-4" />
            <span>{expiredAddonCount} add-on{expiredAddonCount > 1 ? "s" : ""} also expired</span>
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">What you can still do:</p>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
            <li>View your dashboard</li>
            <li>Access historical reports and sales data</li>
            <li>Manage your subscription settings</li>
          </ul>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium text-destructive">What's blocked:</p>
          <ul className="text-muted-foreground space-y-1 ml-4 list-disc">
            <li>Creating new sales</li>
            <li>Adding or adjusting stock</li>
            <li>Managing staff and branches</li>
            <li>Recording expenses</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <Button 
            onClick={onRenew} 
            size="lg" 
            className="w-full gap-2 bg-destructive hover:bg-destructive/90" 
            disabled={isNavigating}
          >
            {isNavigating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
            Renew Subscription
          </Button>
          <Button 
            variant="outline" 
            onClick={onRefresh} 
            className="w-full gap-2"
            disabled={isNavigating}
          >
            <RefreshCw className="h-4 w-4" />
            Check Status Again
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your data is safe and will be fully accessible once you renew.
        </p>
      </CardContent>
    </Card>
  );
}

interface AddonExpiryBannerProps {
  expiredAddons: Array<{
    featureName: string;
    endDate: Date | null;
    branchId: string | null;
    alignmentStatus?: string;
  }>;
  onNavigateToSubscription: () => void;
}

function AddonExpiryBanner({ expiredAddons, onNavigateToSubscription }: AddonExpiryBannerProps) {
  return (
    <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-orange-600 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-orange-800">
              {expiredAddons.length} add-on{expiredAddons.length > 1 ? "s" : ""} expired:
            </span>
            <span className="text-orange-700 ml-2">
              {expiredAddons.slice(0, 2).map(a => a.featureName).join(", ")}
              {expiredAddons.length > 2 && ` +${expiredAddons.length - 2} more`}
            </span>
          </div>
        </div>
        <Button 
          size="sm" 
          variant="outline" 
          onClick={onNavigateToSubscription}
          className="border-orange-300 text-orange-700 hover:bg-orange-100 flex-shrink-0"
        >
          Renew Add-ons
        </Button>
      </div>
    </div>
  );
}

interface AddonExpiringSoonBannerProps {
  expiringAddons: Array<{
    featureName: string;
    endDate: Date | null;
    expiresInDays: number | null;
  }>;
  onNavigateToSubscription: () => void;
}

function AddonExpiringSoonBanner({ expiringAddons, onNavigateToSubscription }: AddonExpiringSoonBannerProps) {
  const soonest = expiringAddons.reduce((prev, curr) => 
    (curr.expiresInDays || 999) < (prev.expiresInDays || 999) ? curr : prev
  , expiringAddons[0]);

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span className="text-amber-800">
            <span className="font-medium">{soonest.featureName}</span> expires in{" "}
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">
              {soonest.expiresInDays} day{soonest.expiresInDays !== 1 ? "s" : ""}
            </Badge>
            {soonest.endDate && (
              <span className="text-amber-600 ml-1">
                ({format(soonest.endDate, "MMM d, yyyy")})
              </span>
            )}
          </span>
        </div>
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onNavigateToSubscription}
          className="text-amber-700 hover:bg-amber-100 flex-shrink-0"
        >
          Extend Now
        </Button>
      </div>
    </div>
  );
}
