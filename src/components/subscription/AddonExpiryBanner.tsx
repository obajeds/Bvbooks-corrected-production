import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Sparkles, Loader2, Lock, X } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import type { AddonExpiryInfo } from "@/hooks/useAddonExpiry";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface AddonExpiryBannerProps {
  /** Add-ons that are expiring soon (within 7 days) */
  expiringAddons: AddonExpiryInfo[];
  /** Add-ons that have already expired */
  expiredAddons: AddonExpiryInfo[];
  /** Whether the main plan is active */
  isMainPlanActive: boolean;
  /** Whether the current user can manage subscriptions (owner only) */
  canManage?: boolean;
  /** Custom handler for renewal - defaults to centralized navigation */
  onRenewAddon?: (addonId: string) => void;
  /** Compact mode for embedding in smaller spaces */
  compact?: boolean;
  /** Callback when the banner is dismissed */
  onDismiss?: () => void;
}

/**
 * AddonExpiryBanner - Displays warnings for expiring or expired add-ons
 * 
 * Features:
 * - Red alert for expired add-ons
 * - Orange alert for add-ons expiring within 7 days
 * - "Renew Add-On" CTA for expired
 * - "Renew Subscription" CTA when main plan is expired (disables addon CTAs)
 */
export function AddonExpiryBanner({
  expiringAddons,
  expiredAddons,
  isMainPlanActive,
  canManage = true,
  onRenewAddon,
  compact = false,
  onDismiss,
}: AddonExpiryBannerProps) {
  const { navigateToRenew, isNavigating } = useSubscriptionNavigation();
  const [isDismissed, setIsDismissed] = useState(false);

  // Filter out expired add-ons that are more than 3 days past expiration
  // Assumption: if user hasn't renewed after 3 days, they don't need the add-on
  const recentlyExpiredAddons = expiredAddons.filter((addon) => {
    if (!addon.endDate) return true; // Show if no end date
    const daysSinceExpiry = differenceInDays(new Date(), addon.endDate);
    return daysSinceExpiry <= 3;
  });

  // Don't show if dismissed or no issues
  if (isDismissed || (recentlyExpiredAddons.length === 0 && expiringAddons.length === 0)) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const CloseButton = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleDismiss}
      className="absolute top-2 right-2 h-6 w-6 rounded-full opacity-70 hover:opacity-100"
      aria-label="Dismiss notification"
    >
      <X className="h-4 w-4" />
    </Button>
  );

  // Main plan expired - show priority message
  if (!isMainPlanActive && (recentlyExpiredAddons.length > 0 || expiringAddons.length > 0)) {
    return (
      <Alert variant="destructive" className={`relative pr-10 ${compact ? "py-2" : ""}`}>
        <CloseButton />
        <Lock className="h-4 w-4" />
        <AlertTitle className={compact ? "text-sm" : ""}>
          Subscription Expired
        </AlertTitle>
        <AlertDescription className={compact ? "text-xs" : ""}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span>
              Renew your main subscription to restore access to your{" "}
              {recentlyExpiredAddons.length + expiringAddons.length} add-on
              {recentlyExpiredAddons.length + expiringAddons.length > 1 ? "s" : ""}.
            </span>
            {canManage && (
              <Button
                size={compact ? "sm" : "default"}
                variant="secondary"
                onClick={navigateToRenew}
                disabled={isNavigating}
                className="shrink-0 gap-1"
              >
                {isNavigating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                Renew Subscription
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Expired add-ons (main plan is active) - only show if expired within last 3 days
  if (recentlyExpiredAddons.length > 0) {
    return (
      <Alert variant="destructive" className={`relative pr-10 ${compact ? "py-2" : ""}`}>
        <CloseButton />
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className={compact ? "text-sm" : ""}>
          {recentlyExpiredAddons.length} Add-on{recentlyExpiredAddons.length > 1 ? "s" : ""} Expired
        </AlertTitle>
        <AlertDescription className={compact ? "text-xs" : ""}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {recentlyExpiredAddons.slice(0, 3).map((addon) => (
                <Badge key={addon.id} variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  {addon.featureName}
                  {addon.endDate && (
                    <span className="ml-1 text-[10px] opacity-80">
                      (expired {format(addon.endDate, "dd MMM")})
                    </span>
                  )}
                </Badge>
              ))}
              {recentlyExpiredAddons.length > 3 && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  +{recentlyExpiredAddons.length - 3} more
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-sm">Renew to restore access to these features.</span>
              {canManage && recentlyExpiredAddons.length === 1 && onRenewAddon && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRenewAddon(recentlyExpiredAddons[0].id)}
                  className="shrink-0 gap-1 h-7 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  Renew Add-on
                </Button>
              )}
              {canManage && recentlyExpiredAddons.length > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={navigateToRenew}
                  disabled={isNavigating}
                  className="shrink-0 gap-1 h-7 text-xs"
                >
                  {isNavigating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  View Add-ons
                </Button>
              )}
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Expiring soon add-ons
  if (expiringAddons.length > 0) {
    const urgentAddons = expiringAddons.filter(a => a.expiresInDays !== null && a.expiresInDays <= 3);
    const isUrgent = urgentAddons.length > 0;

    return (
      <Alert className={`relative pr-10 ${isUrgent ? "border-warning bg-warning/10" : "border-warning/50 bg-warning/5"} ${compact ? "py-2" : ""}`}>
        <CloseButton />
        <Clock className={`h-4 w-4 ${isUrgent ? "text-warning" : "text-warning/80"}`} />
        <AlertTitle className={`${isUrgent ? "text-warning-foreground" : "text-warning-foreground/90"} ${compact ? "text-sm" : ""}`}>
          {expiringAddons.length} Add-on{expiringAddons.length > 1 ? "s" : ""} Expiring Soon
        </AlertTitle>
        <AlertDescription className={`${isUrgent ? "text-warning-foreground/90" : "text-warning-foreground/80"} ${compact ? "text-xs" : ""}`}>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {expiringAddons.slice(0, 3).map((addon) => (
                <Badge 
                  key={addon.id} 
                  variant="outline" 
                  className={`${
                    addon.expiresInDays !== null && addon.expiresInDays <= 3 
                      ? "bg-warning/20 text-warning-foreground border-warning" 
                      : "bg-warning/10 text-warning-foreground/90 border-warning/50"
                  }`}
                >
                  {addon.featureName}
                  {addon.expiresInDays !== null && (
                    <span className="ml-1 text-[10px] font-medium">
                      ({addon.expiresInDays === 0 ? "today" : `${addon.expiresInDays}d`})
                    </span>
                  )}
                </Badge>
              ))}
              {expiringAddons.length > 3 && (
                <Badge variant="outline" className="bg-warning/10 text-warning-foreground/90 border-warning/50">
                  +{expiringAddons.length - 3} more
                </Badge>
              )}
            </div>
            {canManage && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-sm">Renew before expiry to avoid service interruption.</span>
                {expiringAddons.length === 1 && onRenewAddon && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRenewAddon(expiringAddons[0].id)}
                    className="shrink-0 gap-1 h-7 text-xs bg-warning/20 hover:bg-warning/30 border-warning/50"
                  >
                    <Sparkles className="h-3 w-3" />
                    Renew Now
                  </Button>
                )}
              </div>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
