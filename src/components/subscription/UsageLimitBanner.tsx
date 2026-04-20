import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, AlertTriangle, TrendingUp, Sparkles, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUpgradeCTA, ADDONS_ALLOWED } from "@/lib/subscriptionCapacity";
import type { BVBooksPlan } from "@/hooks/useFeatureGating";
import type { BranchCapacityInfo } from "@/lib/subscriptionCapacity";
import { useSubscriptionNavigation } from "@/hooks/useSubscriptionNavigation";

interface UsageLimitBannerProps {
  /** Type of resource being limited */
  resourceType: "staff" | "branch" | "product";
  /** Current usage count */
  current: number;
  /** Maximum allowed count */
  max: number;
  /** Whether the limit is unlimited */
  isUnlimited?: boolean;
  /** Number from add-ons (shown separately) */
  addonCount?: number;
  /** Whether admin/owner is excluded from count */
  adminExcluded?: boolean;
  /** Show compact version without progress bar */
  compact?: boolean;
  /** Custom class name */
  className?: string;
  /** Current plan for upgrade messaging */
  plan?: BVBooksPlan;
  /** Whether add-ons can still be purchased */
  canBuyAddon?: boolean;
  /** Branch name for branch-scoped messaging */
  branchName?: string;
}

const RESOURCE_LABELS: Record<string, { singular: string; plural: string }> = {
  staff: { singular: "staff member", plural: "staff members" },
  branch: { singular: "branch", plural: "branches" },
  product: { singular: "product", plural: "products" },
};

export function UsageLimitBanner({
  resourceType,
  current,
  max,
  isUnlimited = false,
  addonCount = 0,
  adminExcluded = false,
  compact = false,
  className,
  plan = "free",
  canBuyAddon = false,
  branchName,
}: UsageLimitBannerProps) {
  const { navigateToUpgrade, isNavigating } = useSubscriptionNavigation();
  const labels = RESOURCE_LABELS[resourceType] || { singular: resourceType, plural: `${resourceType}s` };
  
  // Calculate percentages
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = !isUnlimited && percentage >= 80 && percentage < 100;
  const isBlocked = !isUnlimited && current >= max;
  const remaining = isUnlimited ? Infinity : Math.max(0, max - current);

  // Format display values
  const maxDisplay = isUnlimited ? "∞" : max;
  const usageText = `${current}/${maxDisplay} ${labels.plural} used`;

  // Get upgrade CTA based on plan
  const upgradeCTA = getUpgradeCTA(plan);
  const addonsAllowed = ADDONS_ALLOWED[plan];

  // Don't show anything if plenty of room (less than 80%)
  if (!isWarning && !isBlocked) {
    return null;
  }

  const handleUpgrade = () => {
    navigateToUpgrade();
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-sm", className)}>
        {isBlocked ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-warning" />
        )}
        <span className={isBlocked ? "text-destructive" : "text-warning"}>
          {usageText}
        </span>
        {isBlocked && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={handleUpgrade} disabled={isNavigating}>
            {isNavigating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Upgrade
          </Button>
        )}
      </div>
    );
  }

  if (isBlocked) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Limit Reached{branchName ? ` - ${branchName}` : ""}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>
            {branchName ? (
              <>This branch has reached its maximum of <strong>{max} {max === 1 ? labels.singular : labels.plural}</strong>.</>
            ) : (
              <>You've reached the maximum of <strong>{max} {max === 1 ? labels.singular : labels.plural}</strong> for your plan.</>
            )}
            {adminExcluded && (
              <span className="text-muted-foreground ml-1">
                (Business Owner is not counted)
              </span>
            )}
          </p>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Progress value={100} className="h-2 flex-1" />
            <span className="text-sm font-medium whitespace-nowrap">{usageText}</span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {/* Show add-on option first if available */}
            {canBuyAddon && addonsAllowed && (resourceType === "staff" || resourceType === "branch") && (
              <Button size="sm" onClick={handleUpgrade} disabled={isNavigating}>
                {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Buy Add-on
              </Button>
            )}
            
            {/* Show upgrade/new business based on plan */}
            {upgradeCTA.action === "new_business" ? (
              <Button variant={canBuyAddon ? "outline" : "default"} size="sm" onClick={handleUpgrade} disabled={isNavigating}>
                {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
                {upgradeCTA.label}
              </Button>
            ) : (
              <Button variant={canBuyAddon ? "outline" : "default"} size="sm" onClick={handleUpgrade} disabled={isNavigating}>
                {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                {upgradeCTA.label}
              </Button>
            )}
          </div>
          
          {upgradeCTA.action === "new_business" && (
            <p className="text-xs text-muted-foreground">
              {upgradeCTA.description}
            </p>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // Warning state (80-99%)
  return (
    <Alert className={cn("border-warning/50 bg-warning/10", className)}>
      <AlertTriangle className="h-4 w-4 text-warning" />
      <AlertTitle className="text-warning">Approaching Limit</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          You have <strong>{remaining}</strong> {remaining === 1 ? labels.singular : labels.plural} remaining.
          {addonCount > 0 && (
            <span className="text-muted-foreground ml-1">
              (includes {addonCount} from add-ons)
            </span>
          )}
          {adminExcluded && (
            <span className="text-muted-foreground ml-1">
              Admin/Owner access is not counted.
            </span>
          )}
        </p>
        
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Progress value={percentage} className="h-2 flex-1 [&>div]:bg-warning" />
          <span className="text-sm font-medium whitespace-nowrap">{usageText}</span>
        </div>

        <Button variant="outline" size="sm" onClick={handleUpgrade} disabled={isNavigating}>
          {isNavigating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
          Upgrade for more
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Inline usage display for headers/descriptions
 */
export function UsageInline({
  current,
  max,
  isUnlimited = false,
  addonCount = 0,
  showWarning = true,
}: {
  current: number;
  max: number;
  isUnlimited?: boolean;
  addonCount?: number;
  showWarning?: boolean;
}) {
  const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = showWarning && !isUnlimited && percentage >= 80;
  const maxDisplay = isUnlimited ? "∞" : max;

  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn(
        "font-medium",
        isWarning && percentage >= 100 && "text-destructive",
        isWarning && percentage < 100 && "text-warning"
      )}>
        {current}/{maxDisplay}
      </span>
      <span className="text-muted-foreground">used</span>
      {addonCount > 0 && (
        <span className="text-xs text-muted-foreground ml-1">
          (+{addonCount} add-on)
        </span>
      )}
    </span>
  );
}
