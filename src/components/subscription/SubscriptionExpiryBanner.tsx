import { AlertTriangle, Clock, X, Sparkles, Loader2, Puzzle, TrendingUp } from "lucide-react";
import { useState } from "react";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useAddonExpiry } from "@/hooks/useAddonExpiry";
import { useSubscriptionPlanRules } from "@/hooks/useSubscriptionPlanRules";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface SubscriptionExpiryBannerProps {
  /** Optional businessId - if not provided, uses current user's business */
  businessId?: string;
  /** Custom handler for renew action - if not provided, uses centralized navigation */
  onRenew?: () => void;
  /** Whether the banner can be dismissed */
  dismissible?: boolean;
}

/**
 * SubscriptionExpiryBanner - Shows warning when subscription is expiring or expired.
 * STRICT MODE: No grace period messaging. Expired = blocked immediately.
 * Uses centralized subscription navigation handler.
 * Now also shows add-on expiry warnings and free trial countdown.
 */
export function SubscriptionExpiryBanner({
  onRenew,
  dismissible = true,
}: SubscriptionExpiryBannerProps) {
  const { 
    status, 
    tier, 
    hasAccess, 
    expiryDate, 
    hadPaidPlan, 
    isLoading 
  } = useSubscriptionStatus();
  const { 
    expiringAddons, 
    expiredAddons, 
    isMainPlanActive,
    isLoading: addonsLoading 
  } = useAddonExpiry();
  const {
    currentPlan,
    freeTrialDaysRemaining,
    freeTrialExpiryDate,
    isLoading: rulesLoading,
  } = useSubscriptionPlanRules();
  const [dismissed, setDismissed] = useState(false);
  const [freeTrialDismissed, setFreeTrialDismissed] = useState(false);
  const [addonBannerDismissed, setAddonBannerDismissed] = useState(false);
  const { navigateToRenew, navigateToUpgrade, isNavigating } = useSubscriptionNavigation();

  const handleRenew = () => {
    if (onRenew) {
      onRenew();
    } else {
      navigateToRenew();
    }
  };

  const handleUpgrade = () => {
    navigateToUpgrade();
  };

  // Filter expired add-ons to only show those within 3 days of expiry
  // After 3 days without renewal, assume user doesn't need it
  const recentlyExpiredAddons = expiredAddons.filter((addon) => {
    if (!addon.endDate) return true;
    const daysSinceExpiry = differenceInDays(new Date(), addon.endDate);
    return daysSinceExpiry <= 3;
  });

  // Combined loading state
  if (isLoading || addonsLoading || rulesLoading) {
    return null;
  }

  // True free tier users (never had a paid plan) don't need expiry banners for paid plans
  // But they may need free trial countdown if within 7 days
  const isTrueFree = !hadPaidPlan && tier === "free";
  const showFreeTrialBanner = !freeTrialDismissed && currentPlan === "free" && freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 7;

  // Calculate main plan banner visibility (for paid plans only)
  const now = new Date();
  const daysUntilExpiry = expiryDate ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpired = !hasAccess && hadPaidPlan;
  const showMainPlanBanner = !dismissed && !isTrueFree && expiryDate && (isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 7));

  // Calculate add-on banner visibility (only show if main plan is active)
  const hasAddonIssues = recentlyExpiredAddons.length > 0 || expiringAddons.length > 0;
  const showAddonBanner = !addonBannerDismissed && isMainPlanActive && hasAddonIssues;

  // Determine urgency level for main plan
  const isMainUrgent = isExpired || (daysUntilExpiry !== null && daysUntilExpiry <= 3);
  const isMainWarning = !isMainUrgent && daysUntilExpiry !== null && daysUntilExpiry <= 7;

  // Get display tier
  const displayTier = hadPaidPlan && tier === "free" ? "paid" : tier;

  const getMessage = () => {
    if (!expiryDate) return "";
    const formattedDate = format(expiryDate, "MMMM d, yyyy");
    
    if (isExpired) {
      return `Your subscription expired on ${formattedDate}. Access to premium features is blocked. Renew now to restore full access.`;
    }
    if (daysUntilExpiry === 0) {
      return `Your ${displayTier} subscription expires TODAY. Renew now to avoid losing access to premium features.`;
    }
    if (daysUntilExpiry === 1) {
      return `Your ${displayTier} subscription expires TOMORROW. Renew now to avoid losing access.`;
    }
    return `Your ${displayTier} subscription expires in ${daysUntilExpiry} days (${formattedDate}). Renew to maintain access.`;
  };

  // Expired banners cannot be dismissed
  const canDismissMain = dismissible && !isExpired;
  const canDismissAddon = dismissible; // Always allow dismiss for add-on banners
  const canDismissFreeTrial = dismissible && (freeTrialDaysRemaining === null || freeTrialDaysRemaining > 3);

  return (
    <>
      {/* Free Trial Countdown Banner */}
      {showFreeTrialBanner && (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
            freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 3 
              ? "bg-destructive text-destructive-foreground" 
              : "bg-amber-400 text-amber-950"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {freeTrialDaysRemaining === 0 
                ? "Your free plan expires today! Upgrade now to continue using BVBooks."
                : freeTrialDaysRemaining === 1
                ? "Your free plan expires tomorrow. Upgrade to maintain access."
                : `Your free plan expires in ${freeTrialDaysRemaining} days${freeTrialExpiryDate ? ` (${format(freeTrialExpiryDate, "MMM d")})` : ""}. Upgrade now!`
              }
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 3 ? "secondary" : "outline"}
              className={cn(
                "h-7 text-xs gap-1",
                (freeTrialDaysRemaining === null || freeTrialDaysRemaining > 3) && "bg-white/20 border-white/30 hover:bg-white/30"
              )}
              onClick={handleUpgrade}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
              Upgrade Now
            </Button>
            {canDismissFreeTrial && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7",
                  freeTrialDaysRemaining !== null && freeTrialDaysRemaining <= 3 && "hover:bg-destructive-foreground/10",
                  (freeTrialDaysRemaining === null || freeTrialDaysRemaining > 3) && "hover:bg-white/20"
                )}
                onClick={() => setFreeTrialDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Plan Expiry Banner */}
      {showMainPlanBanner && (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-2.5 text-sm",
            isMainUrgent && "bg-destructive text-destructive-foreground",
            isMainWarning && "bg-orange-500 text-white",
            !isMainUrgent && !isMainWarning && "bg-amber-400 text-amber-950"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isMainUrgent ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <Clock className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate">{getMessage()}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={isMainUrgent ? "secondary" : "outline"}
              className={cn(
                "h-7 text-xs gap-1",
                !isMainUrgent && "bg-white/20 border-white/30 hover:bg-white/30"
              )}
              onClick={handleRenew}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {isExpired ? "Renew Now" : "Manage Subscription"}
            </Button>
            {canDismissMain && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7",
                  isMainUrgent && "hover:bg-destructive-foreground/10",
                  !isMainUrgent && "hover:bg-white/20"
                )}
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Add-on Expiry Banner (only if main plan is active) */}
      {showAddonBanner && (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-2 text-sm",
            expiredAddons.length > 0 
              ? "bg-destructive/90 text-destructive-foreground" 
              : "bg-amber-400/90 text-amber-950"
          )}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Puzzle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {expiredAddons.length > 0 ? (
                <>
                  {expiredAddons.length} add-on{expiredAddons.length > 1 ? "s" : ""} expired
                  {expiredAddons.slice(0, 2).map((addon) => (
                    <Badge 
                      key={addon.id} 
                      variant="outline" 
                      className="ml-1.5 text-[10px] py-0 h-4 bg-white/10 border-white/30"
                    >
                      {addon.featureName}
                    </Badge>
                  ))}
                  {recentlyExpiredAddons.length > 2 && (
                    <Badge 
                      variant="outline" 
                      className="ml-1 text-[10px] py-0 h-4 bg-white/10 border-white/30"
                    >
                      +{recentlyExpiredAddons.length - 2}
                    </Badge>
                  )}
                </>
              ) : (
                <>
                  {expiringAddons.length} add-on{expiringAddons.length > 1 ? "s" : ""} expiring soon
                  {expiringAddons.slice(0, 2).map((addon) => (
                    <Badge 
                      key={addon.id} 
                      variant="outline" 
                      className="ml-1.5 text-[10px] py-0 h-4 bg-amber-950/10 border-amber-800/30"
                    >
                      {addon.featureName}
                      {addon.expiresInDays !== null && (
                        <span className="ml-0.5 opacity-70">
                          ({addon.expiresInDays}d)
                        </span>
                      )}
                    </Badge>
                  ))}
                </>
              )}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant={recentlyExpiredAddons.length > 0 ? "secondary" : "outline"}
              className={cn(
                "h-7 text-xs gap-1",
                recentlyExpiredAddons.length === 0 && "bg-white/20 border-white/30 hover:bg-white/30"
              )}
              onClick={handleRenew}
              disabled={isNavigating}
            >
              {isNavigating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              View Add-ons
            </Button>
            {canDismissAddon && (
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "h-7 w-7",
                  recentlyExpiredAddons.length > 0 && "hover:bg-destructive-foreground/10",
                  recentlyExpiredAddons.length === 0 && "hover:bg-white/20"
                )}
                onClick={() => setAddonBannerDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
