/**
 * React hook wrapper for canAccessFeature
 * Provides a simple API to check feature access in components
 */

import { useMemo } from "react";
import { usePlatformFeatures } from "./usePlatformFeatures";
import { usePlanFeatures, useBusinessOverrides, useBusinessPlan } from "./useFeatureGating";
import { useBranchContext } from "@/contexts/BranchContext";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import { useAddonExpiry } from "./useAddonExpiry";
import { canAccessFeature, type FeatureAccessOptions, type FeatureAccessState, getBlockedMessage } from "@/lib/featureAccess";

/**
 * Hook to check if a feature is accessible
 * 
 * This is the React hook wrapper for the canAccessFeature function.
 * Use this in components to check feature access.
 * 
 * @example
 * const { canAccess, reason, message, isLoading } = useFeatureAccess({
 *   platformKey: 'sales_reports',
 *   planKey: 'sales.create',
 *   permissions: ['pos.access'],
 *   addonKey: 'email_notifications', // Check if addon is active and not expired
 * });
 */
export function useFeatureAccess(options: FeatureAccessOptions = {}) {
  // Fetch all required data
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();
  const { data: planFeatures = [], isLoading: planLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: planInfo, isLoading: planInfoLoading } = useBusinessPlan();
  const { isOwner, hasPermission, isLoading: permissionsLoading, currentBranch } = useBranchContext();
  const { status, isStrictlyActive, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const { isAddonAccessible, isLoading: addonsLoading } = useAddonExpiry();

  const isLoading = platformLoading || planLoading || overridesLoading || planInfoLoading || permissionsLoading || subscriptionLoading || addonsLoading;

  const result = useMemo(() => {
    if (isLoading) {
      return {
        canAccess: false,
        reason: 'allowed' as const,
        message: '',
        isLoading: true,
      };
    }

    // Build state object
    // Determine if subscription is effectively "free" (none = free tier)
    const isFreeOrNone = status === 'none' || planInfo?.effectivePlan === 'free';
    
    const state: FeatureAccessState = {
      platformFeatures: platformFeatures.map(p => ({ feature_key: p.feature_key, is_enabled: p.is_enabled })),
      planFeatures: planFeatures.map(f => ({ feature_key: f.feature_key, is_enabled: f.is_enabled })),
      overrides: overrides.map(o => ({ feature_key: o.feature_key, is_enabled: o.is_enabled })),
      effectivePlan: planInfo?.effectivePlan || 'free',
      isOwner,
      hasPermission,
      subscriptionStatus: status,
      // Only expired if not strictly active AND not on free tier
      isSubscriptionExpired: !isStrictlyActive && !isFreeOrNone,
      // Addon access check function
      isAddonAccessible,
    };

    // Use branch ID from context if not specified in options
    const optionsWithBranch: FeatureAccessOptions = {
      ...options,
      branchId: options.branchId || currentBranch?.id,
    };

    const accessResult = canAccessFeature(state, optionsWithBranch);
    
    return {
      canAccess: accessResult.canAccess,
      reason: accessResult.reason,
      message: getBlockedMessage(accessResult.reason),
      isLoading: false,
    };
  }, [
    isLoading,
    platformFeatures,
    planFeatures,
    overrides,
    planInfo,
    isOwner,
    hasPermission,
    status,
    isStrictlyActive,
    isAddonAccessible,
    currentBranch?.id,
    options,
  ]);

  return result;
}

/**
 * Hook to get the feature access state for use with canAccessFeature
 * Use this when you need to check multiple features with the same state
 */
export function useFeatureAccessState(): { state: FeatureAccessState | null; isLoading: boolean } {
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();
  const { data: planFeatures = [], isLoading: planLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: planInfo, isLoading: planInfoLoading } = useBusinessPlan();
  const { isOwner, hasPermission, isLoading: permissionsLoading } = useBranchContext();
  const { status, isStrictlyActive, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const { isAddonAccessible, isLoading: addonsLoading } = useAddonExpiry();

  const isLoading = platformLoading || planLoading || overridesLoading || planInfoLoading || permissionsLoading || subscriptionLoading || addonsLoading;

  const state = useMemo((): FeatureAccessState | null => {
    if (isLoading) return null;

    // Determine if subscription is effectively "free" (none = free tier)
    const isFreeOrNone = status === 'none' || planInfo?.effectivePlan === 'free';
    
    return {
      platformFeatures: platformFeatures.map(p => ({ feature_key: p.feature_key, is_enabled: p.is_enabled })),
      planFeatures: planFeatures.map(f => ({ feature_key: f.feature_key, is_enabled: f.is_enabled })),
      overrides: overrides.map(o => ({ feature_key: o.feature_key, is_enabled: o.is_enabled })),
      effectivePlan: planInfo?.effectivePlan || 'free',
      isOwner,
      hasPermission,
      subscriptionStatus: status,
      isSubscriptionExpired: !isStrictlyActive && !isFreeOrNone,
      isAddonAccessible,
    };
  }, [
    isLoading,
    platformFeatures,
    planFeatures,
    overrides,
    planInfo,
    isOwner,
    hasPermission,
    status,
    isStrictlyActive,
    isAddonAccessible,
  ]);

  return { state, isLoading };
}

/**
 * Simple hook to check if a platform feature is disabled
 * Use for quick UI hiding without full access check
 */
export function usePlatformFeatureDisabled(featureKey: string): boolean {
  const { data: platformFeatures = [] } = usePlatformFeatures();
  const feature = platformFeatures.find(p => p.feature_key === featureKey);
  return feature ? !feature.is_enabled : false;
}
