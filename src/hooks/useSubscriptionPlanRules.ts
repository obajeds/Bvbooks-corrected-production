/**
 * Subscription Plan Rules Hook
 * 
 * Centralized logic for determining what actions are available
 * for each subscription plan (upgrade, downgrade, renew).
 * 
 * RULES:
 * - Free: Can only upgrade (no renew, no downgrade)
 * - Professional: Can upgrade to Enterprise, can downgrade FROM Enterprise
 * - Enterprise: Can only downgrade to Professional (top tier)
 * 
 * Downgrade to Free is NEVER allowed for any paid plan.
 */

import { useMemo } from "react";
import { useBusinessPlan } from "./useFeatureGating";
import { useBusiness } from "./useBusiness";
import { differenceInDays, addDays } from "date-fns";
import type { BVBooksPlan } from "./useFeatureGating";

export interface PlanRules {
  /** Whether this plan can be upgraded to */
  canUpgradeTo: boolean;
  /** Whether this plan can be downgraded to */
  canDowngradeTo: boolean;
  /** Whether current plan can be renewed */
  canRenew: boolean;
  /** Label for the CTA button */
  ctaLabel: string;
  /** Whether the CTA is disabled */
  ctaDisabled: boolean;
  /** Tooltip/reason for disabled state */
  disabledReason: string | null;
  /** Whether to show warning before action */
  showWarning: boolean;
  /** Warning message if applicable */
  warningMessage: string | null;
}

export interface PlanAction {
  type: "upgrade" | "downgrade" | "renew" | "current" | "none";
  targetPlan: BVBooksPlan;
}

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<BVBooksPlan, number> = {
  free: 0,
  professional: 1,
  enterprise: 2,
};

export interface UseSubscriptionPlanRulesReturn {
  /** Current effective plan */
  currentPlan: BVBooksPlan;
  /** Days remaining in free trial (null if not on free plan or expired) */
  freeTrialDaysRemaining: number | null;
  /** Whether free trial has started */
  hasStartedFreeTrial: boolean;
  /** Free trial expiry date */
  freeTrialExpiryDate: Date | null;
  /** Get rules for a specific target plan */
  getPlanRules: (targetPlan: BVBooksPlan) => PlanRules;
  /** Get the action type for transitioning to a plan */
  getPlanAction: (targetPlan: BVBooksPlan) => PlanAction;
  /** Whether subscription is expired */
  isExpired: boolean;
  /** Expiry date for paid plans */
  paidPlanExpiryDate: Date | null;
  /** Loading state */
  isLoading: boolean;
}

const FREE_TRIAL_DAYS = 30;

export function useSubscriptionPlanRules(): UseSubscriptionPlanRulesReturn {
  const { data: planInfo, isLoading: planLoading } = useBusinessPlan();
  const { data: business, isLoading: businessLoading } = useBusiness();

  const isLoading = planLoading || businessLoading;
  const currentPlan = planInfo?.effectivePlan || "free";

  // Calculate free trial info
  const freeTrialInfo = useMemo(() => {
    if (currentPlan !== "free") {
      return {
        daysRemaining: null,
        hasStarted: false,
        expiryDate: null,
      };
    }

    // Check for trial start date
    const trialStartDate = business?.plan_started_at || business?.trial_started_at;
    
    if (!trialStartDate) {
      // Trial hasn't started yet - treat as full 30 days
      return {
        daysRemaining: FREE_TRIAL_DAYS,
        hasStarted: false,
        expiryDate: null,
      };
    }

    const startDate = new Date(trialStartDate);
    const expiryDate = addDays(startDate, FREE_TRIAL_DAYS);
    const now = new Date();
    const daysRemaining = Math.max(0, differenceInDays(expiryDate, now));

    return {
      daysRemaining,
      hasStarted: true,
      expiryDate,
    };
  }, [currentPlan, business?.plan_started_at, business?.trial_started_at]);

  // Check paid plan expiry
  const paidPlanInfo = useMemo(() => {
    if (currentPlan === "free") {
      return { isExpired: false, expiryDate: null };
    }

    const expiryDateStr = business?.plan_expires_at || business?.subscription_expiry;
    if (!expiryDateStr) {
      return { isExpired: false, expiryDate: null };
    }

    const expiryDate = new Date(expiryDateStr);
    const isExpired = expiryDate < new Date();

    return { isExpired, expiryDate };
  }, [currentPlan, business?.plan_expires_at, business?.subscription_expiry]);

  const getPlanRules = useMemo(() => {
    return (targetPlan: BVBooksPlan): PlanRules => {
      const currentLevel = PLAN_HIERARCHY[currentPlan];
      const targetLevel = PLAN_HIERARCHY[targetPlan];

      // Same plan (current)
      if (targetPlan === currentPlan) {
        // Free plan: No renew, just "Current"
        if (currentPlan === "free") {
          return {
            canUpgradeTo: false,
            canDowngradeTo: false,
            canRenew: false,
            ctaLabel: freeTrialInfo.daysRemaining !== null 
              ? `Free Plan (${freeTrialInfo.daysRemaining} days left)`
              : "Current Plan",
            ctaDisabled: true,
            disabledReason: "You're on the free plan. Upgrade to access more features.",
            showWarning: false,
            warningMessage: null,
          };
        }

        // Paid plan: Allow renewal
        return {
          canUpgradeTo: false,
          canDowngradeTo: false,
          canRenew: true,
          ctaLabel: paidPlanInfo.isExpired ? "Renew Now" : "Renew / Extend",
          ctaDisabled: false,
          disabledReason: null,
          showWarning: false,
          warningMessage: null,
        };
      }

      // Target is higher tier (upgrade)
      if (targetLevel > currentLevel) {
        return {
          canUpgradeTo: true,
          canDowngradeTo: false,
          canRenew: false,
          ctaLabel: "Upgrade Now",
          ctaDisabled: false,
          disabledReason: null,
          showWarning: false,
          warningMessage: null,
        };
      }

      // Target is lower tier (downgrade)
      if (targetLevel < currentLevel) {
        // RULE: Downgrade to Free is NEVER allowed
        if (targetPlan === "free") {
          return {
            canUpgradeTo: false,
            canDowngradeTo: false,
            canRenew: false,
            ctaLabel: "Not Available",
            ctaDisabled: true,
            disabledReason: "Downgrading to Free is not allowed. Your plan will remain active until expiry.",
            showWarning: false,
            warningMessage: null,
          };
        }

        // Enterprise → Professional is allowed
        if (currentPlan === "enterprise" && targetPlan === "professional") {
          return {
            canUpgradeTo: false,
            canDowngradeTo: true,
            canRenew: false,
            ctaLabel: "Downgrade",
            ctaDisabled: false,
            disabledReason: null,
            showWarning: true,
            warningMessage: 
              "Downgrading will cancel your current Enterprise subscription. " +
              "The Professional plan will start at your next billing cycle. " +
              "You may lose access to Enterprise-only features. Are you sure?",
          };
        }

        // Other downgrades not allowed
        return {
          canUpgradeTo: false,
          canDowngradeTo: false,
          canRenew: false,
          ctaLabel: "Not Available",
          ctaDisabled: true,
          disabledReason: "This downgrade path is not available.",
          showWarning: false,
          warningMessage: null,
        };
      }

      // Fallback (shouldn't reach here)
      return {
        canUpgradeTo: false,
        canDowngradeTo: false,
        canRenew: false,
        ctaLabel: "Unavailable",
        ctaDisabled: true,
        disabledReason: null,
        showWarning: false,
        warningMessage: null,
      };
    };
  }, [currentPlan, freeTrialInfo.daysRemaining, paidPlanInfo.isExpired]);

  const getPlanAction = useMemo(() => {
    return (targetPlan: BVBooksPlan): PlanAction => {
      if (targetPlan === currentPlan) {
        if (currentPlan === "free") {
          return { type: "current", targetPlan };
        }
        return { type: "renew", targetPlan };
      }

      const currentLevel = PLAN_HIERARCHY[currentPlan];
      const targetLevel = PLAN_HIERARCHY[targetPlan];

      if (targetLevel > currentLevel) {
        return { type: "upgrade", targetPlan };
      }

      if (targetLevel < currentLevel) {
        // Only Enterprise → Professional is allowed
        if (currentPlan === "enterprise" && targetPlan === "professional") {
          return { type: "downgrade", targetPlan };
        }
        return { type: "none", targetPlan };
      }

      return { type: "none", targetPlan };
    };
  }, [currentPlan]);

  return {
    currentPlan,
    freeTrialDaysRemaining: freeTrialInfo.daysRemaining,
    hasStartedFreeTrial: freeTrialInfo.hasStarted,
    freeTrialExpiryDate: freeTrialInfo.expiryDate,
    getPlanRules,
    getPlanAction,
    isExpired: paidPlanInfo.isExpired,
    paidPlanExpiryDate: paidPlanInfo.expiryDate,
    isLoading,
  };
}
