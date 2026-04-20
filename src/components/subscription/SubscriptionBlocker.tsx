import { ReactNode } from "react";
import { useSubscriptionStatus, type SubscriptionAction, BLOCKED_ACTIONS_ON_EXPIRY } from "@/hooks/useSubscriptionStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Lock, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface SubscriptionBlockerProps {
  /** The action being attempted */
  action: SubscriptionAction;
  /** Content to render when access is granted */
  children: ReactNode;
  /** Optional fallback when blocked */
  fallback?: ReactNode;
  /** Optional custom message */
  blockedMessage?: string;
}

/**
 * SubscriptionBlocker - Strictly blocks access when subscription is not ACTIVE.
 * NO grace period. NO soft expiry. IMMEDIATE enforcement.
 */
export function SubscriptionBlocker({
  action,
  children,
  fallback,
  blockedMessage,
}: SubscriptionBlockerProps) {
  const { status, tier, hasAccess, isStrictlyActive, message, refresh, isLoading } = useSubscriptionStatus();
  const { navigateToRenew, isNavigating } = useSubscriptionNavigation();

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Free tier - check if action is allowed
  if (tier === "free") {
    // Free tier can access but has limited features
    return <>{children}</>;
  }

  // Check if this action requires active subscription
  const requiresActiveSubscription = BLOCKED_ACTIONS_ON_EXPIRY.includes(action);

  // If action doesn't require active subscription, allow
  if (!requiresActiveSubscription) {
    return <>{children}</>;
  }

  // STRICT CHECK: Subscription must be active
  if (!isStrictlyActive) {
    // Show fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show blocked state
    return (
      <Card className="border-destructive/50 bg-destructive/5 max-w-lg mx-auto mt-8">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Subscription {status === "expired" ? "Expired" : "Inactive"}
          </CardTitle>
          <CardDescription className="text-base">
            {blockedMessage || message || "Your subscription is not active. Renew to continue."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Your data is safe. Renew your subscription to regain full access to all features.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={navigateToRenew} className="gap-2" disabled={isNavigating}>
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Renew Subscription
            </Button>
            <Button variant="outline" onClick={refresh} className="gap-2" disabled={isNavigating}>
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Access granted
  return <>{children}</>;
}

/**
 * Real-time subscription overlay for pages that should be blocked immediately
 * when subscription expires while user is on the page.
 */
export function SubscriptionOverlay({ children }: { children: ReactNode }) {
  const { status, isStrictlyActive, message, isLoading } = useSubscriptionStatus();
  const { navigateToRenew, isNavigating } = useSubscriptionNavigation();

  // Don't show overlay while loading or if active
  if (isLoading || isStrictlyActive) {
    return <>{children}</>;
  }

  // Show overlay on top of content
  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
        <Card className="border-destructive/50 bg-card shadow-2xl max-w-md mx-4">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
              <Lock className="h-7 w-7 text-destructive" />
            </div>
            <CardTitle className="text-xl flex items-center justify-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Blocked
            </CardTitle>
            <CardDescription className="text-base">
              {message || "Your subscription has expired. Renew to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              This feature requires an active subscription.
            </p>
            <Button onClick={navigateToRenew} className="gap-2 w-full" disabled={isNavigating}>
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Renew Now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
