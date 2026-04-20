/**
 * Centralized hook for subscription navigation
 * 
 * ALL components with subscription CTAs MUST use this hook.
 * This ensures consistent behavior across desktop and mobile.
 * 
 * RULES:
 * 1. Every CTA click MUST result in navigation - no idle states
 * 2. Only business owners can complete subscription changes
 * 3. Staff members see owner-only restriction message
 */

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSubscriptionStatus } from "./useSubscriptionStatus";
import { useBusinessSubscription, type SubscriptionTier } from "./useSubscription";
import { useUserRole } from "./useUserRole";
import {
  type SubscriptionNavigationReason,
  type SubscriptionNavigationContext,
  resolveSubscriptionPath,
  getSubscriptionCTALabel,
  SUBSCRIPTION_PAGE_PATH,
} from "@/lib/subscriptionNavigation";

export interface UseSubscriptionNavigationReturn {
  /** Navigate to subscription page with appropriate context */
  navigateToSubscription: (reason?: SubscriptionNavigationReason, targetTier?: SubscriptionTier) => void;
  /** Navigate specifically for renewal */
  navigateToRenew: () => void;
  /** Navigate specifically for upgrade */
  navigateToUpgrade: (targetTier?: SubscriptionTier) => void;
  /** Navigate for feature unlock */
  navigateToUnlockFeature: (featureKey: string, requiredTier: SubscriptionTier) => void;
  /** Get CTA config (path + label) based on current status */
  getCTAConfig: (reason?: SubscriptionNavigationReason) => { path: string; label: string };
  /** Whether a navigation is in progress */
  isNavigating: boolean;
  /** Current subscription tier */
  currentTier: SubscriptionTier | null;
  /** Whether subscription is expired */
  isExpired: boolean;
  /** Whether subscription is active */
  isActive: boolean;
  /** The canonical subscription page path */
  subscriptionPath: string;
  /** Whether the current user is the business owner */
  isOwner: boolean;
  /** Whether subscription actions are allowed for current user */
  canManageSubscription: boolean;
}

export function useSubscriptionNavigation(): UseSubscriptionNavigationReturn {
  const navigate = useNavigate();
  const { status, tier, isStrictlyActive } = useSubscriptionStatus();
  const { data: subscriptionData } = useBusinessSubscription();
  const { data: roleData } = useUserRole();
  const [isNavigating, setIsNavigating] = useState(false);

  const currentTier = tier || subscriptionData?.subscription?.tier || null;
  const isExpired = status === "expired" || !isStrictlyActive;
  const isActive = isStrictlyActive;
  
  // Only business owners can manage subscriptions
  const isOwner = roleData?.isOwner ?? false;
  const canManageSubscription = isOwner;

  /**
   * Core navigation function - ALWAYS navigates, never idles
   * Shows toast for staff attempting to manage subscription
   */
  const navigateToSubscription = useCallback(
    (reason?: SubscriptionNavigationReason, targetTier?: SubscriptionTier) => {
      // Staff cannot complete subscription actions - notify and still navigate
      if (!canManageSubscription) {
        toast.error(
          "Only the business owner can manage subscriptions. Please contact your business owner.",
          { duration: 5000 }
        );
        // Still navigate so they can see the plans, but payment will be blocked
      }

      setIsNavigating(true);

      // Determine reason automatically if not provided
      let effectiveReason = reason;
      if (!effectiveReason) {
        if (isExpired) {
          effectiveReason = "expired";
        } else if (currentTier === "free") {
          effectiveReason = "subscribe";
        } else {
          effectiveReason = "upgrade";
        }
      }

      const context: SubscriptionNavigationContext = {
        status: status === "loading" ? undefined : status,
        currentTier,
        targetTier,
        reason: effectiveReason,
      };

      const path = resolveSubscriptionPath(context);
      
      // CRITICAL: Navigate immediately - no conditions that could cause idle
      try {
        navigate(path);
      } catch (err) {
        console.error("[SubscriptionNavigation] Navigation failed:", err);
        toast.error("Navigation failed. Please try again.");
      } finally {
        // Reset navigation state after a short delay
        setTimeout(() => {
          setIsNavigating(false);
        }, 100);
      }
    },
    [navigate, status, currentTier, isExpired, canManageSubscription]
  );

  const navigateToRenew = useCallback(() => {
    navigateToSubscription("renew");
  }, [navigateToSubscription]);

  const navigateToUpgrade = useCallback(
    (targetTier?: SubscriptionTier) => {
      navigateToSubscription("upgrade", targetTier);
    },
    [navigateToSubscription]
  );

  const navigateToUnlockFeature = useCallback(
    (featureKey: string, requiredTier: SubscriptionTier) => {
      if (!canManageSubscription) {
        toast.error(
          "Only the business owner can upgrade the subscription. Please contact your business owner.",
          { duration: 5000 }
        );
      }

      setIsNavigating(true);

      const context: SubscriptionNavigationContext = {
        status: status === "loading" ? undefined : status,
        currentTier,
        targetTier: requiredTier,
        reason: "feature_locked",
        featureKey,
      };

      const path = resolveSubscriptionPath(context);
      
      try {
        navigate(path);
      } catch (err) {
        console.error("[SubscriptionNavigation] Feature unlock navigation failed:", err);
        toast.error("Navigation failed. Please try again.");
      } finally {
        setTimeout(() => {
          setIsNavigating(false);
        }, 100);
      }
    },
    [navigate, status, currentTier, canManageSubscription]
  );

  const getCTAConfig = useCallback(
    (reason?: SubscriptionNavigationReason) => {
      let effectiveReason = reason;
      if (!effectiveReason) {
        if (isExpired) {
          effectiveReason = "expired";
        } else if (currentTier === "free") {
          effectiveReason = "subscribe";
        } else {
          effectiveReason = "upgrade";
        }
      }

      const context: SubscriptionNavigationContext = {
        status: status === "loading" ? undefined : status,
        currentTier,
        reason: effectiveReason,
      };

      return {
        path: resolveSubscriptionPath(context),
        label: getSubscriptionCTALabel(context),
      };
    },
    [status, currentTier, isExpired]
  );

  return {
    navigateToSubscription,
    navigateToRenew,
    navigateToUpgrade,
    navigateToUnlockFeature,
    getCTAConfig,
    isNavigating,
    currentTier,
    isExpired,
    isActive,
    subscriptionPath: SUBSCRIPTION_PAGE_PATH,
    isOwner,
    canManageSubscription,
  };
}
