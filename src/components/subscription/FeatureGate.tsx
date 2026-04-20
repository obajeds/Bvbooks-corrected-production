import { ReactNode } from "react";
import { useFeatureEnabled, BVBooksPlan } from "@/hooks/useFeatureGating";
import { UpgradeRequired } from "./UpgradeRequired";
import { Skeleton } from "@/components/ui/skeleton";

interface FeatureGateProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
  title?: string;
  description?: string;
}

/**
 * FeatureGate - Restricts access to features based on subscription plan
 * 
 * Usage:
 * <FeatureGate featureKey="expenses.recording">
 *   <ExpensesPage />
 * </FeatureGate>
 */
export function FeatureGate({
  featureKey,
  children,
  fallback,
  showUpgradePrompt = true,
  title,
  description,
}: FeatureGateProps) {
  const { isEnabled, isLoading, requiresUpgrade, availableInPlan } = useFeatureEnabled(featureKey);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isEnabled) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt && requiresUpgrade) {
    return (
      <UpgradeRequired
        featureKey={featureKey}
        requiredPlan={availableInPlan || "professional"}
        title={title}
        description={description}
      />
    );
  }

  // Feature is disabled and no upgrade path
  return null;
}

/**
 * Hook to check feature access without rendering
 */
export function useFeatureAccess(featureKey: string) {
  const { isEnabled, isLoading, requiresUpgrade, availableInPlan, limits } = useFeatureEnabled(featureKey);
  
  return {
    hasAccess: isEnabled,
    isLoading,
    requiresUpgrade,
    upgradeToPlan: availableInPlan,
    limits,
  };
}
