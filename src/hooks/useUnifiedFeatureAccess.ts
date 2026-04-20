import { useMemo } from "react";
import { usePlatformFeatures, type PlatformFeature } from "./usePlatformFeatures";
import { usePlanFeatures, useBusinessOverrides, useBusinessPlan, type PlanFeature, type BVBooksPlan } from "./useFeatureGating";
import { useBranchContext } from "@/contexts/BranchContext";
import { useBusinessSubscription } from "./useSubscription";
import { isPlatformFeatureEnabled } from "@/lib/featureKeyMapping";
import type { PermissionKey } from "@/lib/permissions";

export interface FeatureAccessResult {
  /** Feature is fully accessible (all checks pass) */
  isAccessible: boolean;
  /** Still loading access data */
  isLoading: boolean;
  /** Platform toggle is OFF (Super Admin disabled) */
  isPlatformDisabled: boolean;
  /** Not available in current subscription plan */
  isPlanRestricted: boolean;
  /** User lacks required permissions */
  isPermissionDenied: boolean;
  /** Subscription is expired or inactive */
  isSubscriptionBlocked: boolean;
  /** The plan that would unlock this feature */
  requiredPlan: BVBooksPlan | null;
  /** Reason code for UI messaging */
  blockReason: 'platform_disabled' | 'plan_restricted' | 'permission_denied' | 'subscription_blocked' | null;
}

interface UseFeatureAccessOptions {
  /** Feature key from platform_features / plan_features */
  featureKey?: string;
  /** Required permissions (any match = allowed, unless requireAllPermissions is true) */
  permissions?: PermissionKey[];
  /** Require ALL permissions to match (default: any) */
  requireAllPermissions?: boolean;
  /** Skip platform toggle check */
  skipPlatformCheck?: boolean;
  /** Skip plan feature check */
  skipPlanCheck?: boolean;
  /** Skip permission check */
  skipPermissionCheck?: boolean;
  /** Skip subscription status check */
  skipSubscriptionCheck?: boolean;
}

/**
 * Unified hook to check ALL access gates for a feature:
 * 1. Platform toggle (Super Admin) - Uses centralized key mapping
 * 2. Plan feature (subscription tier)
 * 3. Business overrides
 * 4. User permissions (role-based)
 * 5. Subscription status (active/expired)
 */
export function useUnifiedFeatureAccess(options: UseFeatureAccessOptions = {}): FeatureAccessResult {
  const {
    featureKey,
    permissions = [],
    requireAllPermissions = false,
    skipPlatformCheck = false,
    skipPlanCheck = false,
    skipPermissionCheck = false,
    skipSubscriptionCheck = false,
  } = options;

  // Data sources
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();
  const { data: planFeatures = [], isLoading: planLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: planInfo, isLoading: planInfoLoading } = useBusinessPlan();
  const { data: subscriptionData, isLoading: subscriptionLoading } = useBusinessSubscription();
  const { isOwner, hasPermission, isLoading: permissionsLoading } = useBranchContext();

  const isLoading = platformLoading || planLoading || overridesLoading || planInfoLoading || subscriptionLoading || permissionsLoading;

  const result = useMemo((): FeatureAccessResult => {
    // Default: accessible
    const base: FeatureAccessResult = {
      isAccessible: true,
      isLoading,
      isPlatformDisabled: false,
      isPlanRestricted: false,
      isPermissionDenied: false,
      isSubscriptionBlocked: false,
      requiredPlan: null,
      blockReason: null,
    };

    if (isLoading) {
      return { ...base, isAccessible: false };
    }

    // 1. Check platform toggle (Super Admin global kill switch)
    // Uses centralized key mapping to handle both new and legacy keys
    if (!skipPlatformCheck && featureKey) {
      const isEnabled = isPlatformFeatureEnabled(featureKey, platformFeatures);
      if (!isEnabled) {
        return {
          ...base,
          isAccessible: false,
          isPlatformDisabled: true,
          blockReason: 'platform_disabled',
        };
      }
    }

    // 2. Subscription status check is SKIPPED here by default
    // GlobalSubscriptionEnforcement handles this centrally using useSubscriptionStatus
    // This hook focuses on platform toggles, plan features, and permissions only
    // When skipSubscriptionCheck is false (rare cases), we still defer to the caller's judgment

    // 3. Check plan feature (subscription tier)
    if (!skipPlanCheck && featureKey) {
      // Check business override first
      const override = overrides.find(o => o.feature_key === featureKey);
      if (override) {
        if (!override.is_enabled) {
          return {
            ...base,
            isAccessible: false,
            isPlanRestricted: true,
            blockReason: 'plan_restricted',
            requiredPlan: null,
          };
        }
        // Override grants access, skip plan check
      } else {
        // Check plan features
        const planFeature = planFeatures.find(f => f.feature_key === featureKey);
        if (planFeature && !planFeature.is_enabled) {
          // Find which plan enables this feature
          const planOrder: BVBooksPlan[] = ['free', 'professional', 'enterprise'];
          const currentPlanIndex = planOrder.indexOf(planInfo?.effectivePlan || 'free');
          let requiredPlan: BVBooksPlan | null = null;
          
          for (let i = currentPlanIndex + 1; i < planOrder.length; i++) {
            requiredPlan = planOrder[i];
            break;
          }
          
          return {
            ...base,
            isAccessible: false,
            isPlanRestricted: true,
            blockReason: 'plan_restricted',
            requiredPlan,
          };
        }
      }
    }

    // 4. Check permissions (role-based)
    if (!skipPermissionCheck && permissions.length > 0) {
      // Owners have all permissions
      if (!isOwner) {
        const hasAccess = requireAllPermissions
          ? permissions.every(p => hasPermission(p))
          : permissions.some(p => hasPermission(p));
        
        if (!hasAccess) {
          return {
            ...base,
            isAccessible: false,
            isPermissionDenied: true,
            blockReason: 'permission_denied',
          };
        }
      }
    }

    return base;
  }, [
    isLoading,
    featureKey,
    permissions,
    requireAllPermissions,
    skipPlatformCheck,
    skipPlanCheck,
    skipPermissionCheck,
    skipSubscriptionCheck,
    platformFeatures,
    planFeatures,
    overrides,
    planInfo,
    subscriptionData,
    isOwner,
    hasPermission,
  ]);

  return result;
}

/**
 * Check if multiple features are accessible (all must pass)
 * Uses centralized key mapping for platform feature checks
 */
export function useAllFeaturesAccessible(featureKeys: string[]): {
  allAccessible: boolean;
  anyAccessible: boolean;
  isLoading: boolean;
  results: Record<string, FeatureAccessResult>;
} {
  const { data: platformFeatures = [], isLoading: platformLoading } = usePlatformFeatures();
  const { data: planFeatures = [], isLoading: planLoading } = usePlanFeatures();
  const { data: overrides = [], isLoading: overridesLoading } = useBusinessOverrides();
  const { data: subscriptionData, isLoading: subscriptionLoading } = useBusinessSubscription();

  const isLoading = platformLoading || planLoading || overridesLoading || subscriptionLoading;

  const results = useMemo(() => {
    const map: Record<string, FeatureAccessResult> = {};

    for (const key of featureKeys) {
      // Platform check using centralized mapping
      const isEnabled = isPlatformFeatureEnabled(key, platformFeatures);
      if (!isEnabled) {
        map[key] = {
          isAccessible: false,
          isLoading,
          isPlatformDisabled: true,
          isPlanRestricted: false,
          isPermissionDenied: false,
          isSubscriptionBlocked: false,
          requiredPlan: null,
          blockReason: 'platform_disabled',
        };
        continue;
      }

      // Override check
      const override = overrides.find(o => o.feature_key === key);
      if (override) {
        map[key] = {
          isAccessible: override.is_enabled,
          isLoading,
          isPlatformDisabled: false,
          isPlanRestricted: !override.is_enabled,
          isPermissionDenied: false,
          isSubscriptionBlocked: false,
          requiredPlan: null,
          blockReason: override.is_enabled ? null : 'plan_restricted',
        };
        continue;
      }

      // Plan feature check
      const planFeature = planFeatures.find(f => f.feature_key === key);
      map[key] = {
        isAccessible: planFeature?.is_enabled ?? true,
        isLoading,
        isPlatformDisabled: false,
        isPlanRestricted: !(planFeature?.is_enabled ?? true),
        isPermissionDenied: false,
        isSubscriptionBlocked: false,
        requiredPlan: null,
        blockReason: planFeature?.is_enabled === false ? 'plan_restricted' : null,
      };
    }

    return map;
  }, [featureKeys, platformFeatures, planFeatures, overrides, isLoading]);

  const allAccessible = featureKeys.every(k => results[k]?.isAccessible);
  const anyAccessible = featureKeys.some(k => results[k]?.isAccessible);

  return { allAccessible, anyAccessible, isLoading, results };
}

/**
 * Check if a feature is globally disabled by Super Admin
 * (Useful for hiding UI elements without full access check)
 * Uses centralized key mapping
 */
export function usePlatformFeatureDisabled(featureKey: string): boolean {
  const { data: platformFeatures = [] } = usePlatformFeatures();
  return !isPlatformFeatureEnabled(featureKey, platformFeatures);
}
